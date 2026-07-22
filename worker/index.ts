import { defaultSettings } from "../shared/defaults";
import type { ContentItem, ContentType, SiteSettings } from "../shared/types";

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  SESSION_COOKIE_NAME: string;
}

type PrincipalType = "admin" | "member";

interface SessionPrincipal {
  id: number;
  type: PrincipalType;
  email?: string;
  username?: string;
  name: string;
}

interface ContentRow {
  id: number;
  type: ContentType;
  title: string;
  summary: string;
  body: string;
  event_date: string;
  event_location: string;
  attachment_url: string;
  image_url: string;
  published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const CONTENT_TYPES: ContentType[] = ["notice", "event", "resource", "member"];
// Cloudflare Workers 런타임은 PBKDF2 반복 횟수를 최대 100,000회로 제한합니다.
// (OWASP 권장 최소치와 동일한 수준으로, 보안상 충분히 강력합니다.)
const PASSWORD_ITERATIONS = 100_000;
const ADMIN_SESSION_SECONDS = 60 * 60 * 8;
const MEMBER_SESSION_SECONDS = 60 * 60 * 24 * 14;

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function getCookie(request: Request, name: string): string {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function sessionCookieName(env: Env, type: PrincipalType): string {
  return `${env.SESSION_COOKIE_NAME}_${type}`;
}

function cookieHeader(request: Request, env: Env, type: PrincipalType, value: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${sessionCookieName(env, type)}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function randomToken(bytes = 32): string {
  const array = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToBase64(array).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hashPassword(password: string, saltBase64?: string, iterations = PASSWORD_ITERATIONS) {
  const salt = saltBase64
    ? Uint8Array.from(atob(saltBase64), (char) => char.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, 256);
  return { hash: bytesToBase64(new Uint8Array(bits)), salt: bytesToBase64(salt), iterations };
}

async function verifyPassword(password: string, expected: string, salt: string, iterations: number): Promise<boolean> {
  const actual = (await hashPassword(password, salt, iterations)).hash;
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

function assertSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return new URL(origin).host === new URL(request.url).host ? null : error("허용되지 않은 요청입니다.", 403);
}

async function readJson<T>(request: Request): Promise<T> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error("JSON 요청만 허용됩니다.");
  return request.json<T>();
}

async function createSession(request: Request, env: Env, type: PrincipalType, principalId: number): Promise<ResponseInit> {
  const token = randomToken();
  const maxAge = type === "admin" ? ADMIN_SESSION_SECONDS : MEMBER_SESSION_SECONDS;
  const expires = new Date(Date.now() + maxAge * 1000).toISOString();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP").run();
  await env.DB.prepare("INSERT INTO sessions (id, principal_type, principal_id, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)")
    .bind(token, type, principalId, expires, (request.headers.get("user-agent") ?? "").slice(0, 300)).run();
  return { headers: { "set-cookie": cookieHeader(request, env, type, token, maxAge) } };
}

async function getPrincipal(request: Request, env: Env, type: PrincipalType): Promise<SessionPrincipal | null> {
  const token = getCookie(request, sessionCookieName(env, type));
  if (!token) return null;
  if (type === "admin") {
    const row = await env.DB.prepare(`
      SELECT a.id, a.email, a.display_name AS name
      FROM sessions s JOIN admins a ON a.id = s.principal_id
      WHERE s.id = ? AND s.principal_type = 'admin' AND s.expires_at > CURRENT_TIMESTAMP
    `).bind(token).first<{ id: number; email: string; name: string }>();
    return row ? { ...row, type } : null;
  }
  const row = await env.DB.prepare(`
    SELECT m.id, m.username, m.name
    FROM sessions s JOIN members m ON m.id = s.principal_id
    WHERE s.id = ? AND s.principal_type = 'member' AND s.expires_at > CURRENT_TIMESTAMP AND m.status = 'active'
  `).bind(token).first<{ id: number; username: string; name: string }>();
  return row ? { ...row, type } : null;
}

function mapContent(row: ContentRow): ContentItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    body: row.body,
    eventDate: row.event_date,
    eventLocation: row.event_location,
    attachmentUrl: row.attachment_url,
    imageUrl: row.image_url,
    published: Boolean(row.published),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validContentType(value: unknown): value is ContentType {
  return typeof value === "string" && CONTENT_TYPES.includes(value as ContentType);
}

function cleanContent(input: Partial<ContentItem>) {
  if (!validContentType(input.type)) throw new Error("올바른 게시물 종류를 선택해 주세요.");
  const title = String(input.title ?? "").trim().slice(0, 200);
  if (!title) throw new Error("제목을 입력해 주세요.");
  return {
    type: input.type,
    title,
    summary: String(input.summary ?? "").trim().slice(0, 1000),
    body: String(input.body ?? "").trim().slice(0, 100_000),
    eventDate: String(input.eventDate ?? "").trim().slice(0, 50),
    eventLocation: String(input.eventLocation ?? "").trim().slice(0, 300),
    attachmentUrl: String(input.attachmentUrl ?? "").trim().slice(0, 1000),
    imageUrl: String(input.imageUrl ?? "").trim().slice(0, 1000),
    published: input.published === false ? 0 : 1,
    sortOrder: Math.max(-9999, Math.min(9999, Number(input.sortOrder) || 0)),
  };
}

// 긴 텍스트가 저장되어 화면이 깨지거나 저장 용량이 폭증하는 것을 막기 위한 길이 제한 필드 목록.
const SHORT_TEXT_KEYS: Array<keyof SiteSettings> = [
  "organizationName", "organizationSubtitle", "heroSlogan", "heroImageUrl", "logoImageUrl",
  "membershipTitle", "membershipDescription", "footerOrganization", "footerAddress", "footerContact", "footerCopyright",
  "noticeSectionTitle", "eventSectionTitle", "resourceSectionTitle", "memberSectionTitle",
  "loginBoxTitle", "joinButtonLabel", "findAccountLabel", "quickLinksTitle", "moreLabel", "homeLabel", "sitemapLabel",
];

function mergeSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const partial = value as Partial<SiteSettings>;
  const merged: SiteSettings = {
    ...defaultSettings,
    ...partial,
    menus: Array.isArray(partial.menus) ? partial.menus.slice(0, 12).map((menu) => ({ label: String(menu.label ?? "").slice(0, 30), href: String(menu.href ?? "").slice(0, 300) })) : defaultSettings.menus,
    theme: { ...defaultSettings.theme, ...(partial.theme ?? {}) },
  };
  // 모든 짧은 텍스트 필드는 문자열로 강제하고 1000자로 제한합니다.
  for (const key of SHORT_TEXT_KEYS) {
    (merged[key] as string) = String(merged[key] ?? "").slice(0, 1000);
  }
  return merged;
}

async function getSettings(env: Env): Promise<SiteSettings> {
  const row = await env.DB.prepare("SELECT value_json FROM site_settings WHERE key = 'site'").first<{ value_json: string }>();
  if (!row) return defaultSettings;
  try { return mergeSettings(JSON.parse(row.value_json)); } catch { return defaultSettings; }
}

async function audit(env: Env, adminId: number, action: string, targetType: string, targetId = "", detail = "") {
  await env.DB.prepare("INSERT INTO audit_log (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)")
    .bind(adminId, action, targetType, targetId, detail.slice(0, 1000)).run();
}

async function requireAdmin(request: Request, env: Env): Promise<SessionPrincipal | Response> {
  return (await getPrincipal(request, env, "admin")) ?? error("관리자 로그인이 필요합니다.", 401);
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (unsafe) {
    const originError = assertSameOrigin(request);
    if (originError) return originError;
  }

  if (path === "/api/site" && request.method === "GET") return json(await getSettings(env));

  if (path === "/api/content" && request.method === "GET") {
    const type = url.searchParams.get("type");
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 40));
    const statement = validContentType(type)
      ? env.DB.prepare("SELECT * FROM content_items WHERE published = 1 AND type = ? ORDER BY sort_order DESC, created_at DESC LIMIT ?").bind(type, limit)
      : env.DB.prepare("SELECT * FROM content_items WHERE published = 1 ORDER BY sort_order DESC, created_at DESC LIMIT ?").bind(limit);
    const rows = await statement.all<ContentRow>();
    return json(rows.results.map(mapContent));
  }

  const publicItemMatch = path.match(/^\/api\/content\/(\d+)$/);
  if (publicItemMatch && request.method === "GET") {
    const row = await env.DB.prepare("SELECT * FROM content_items WHERE id = ? AND published = 1").bind(Number(publicItemMatch[1])).first<ContentRow>();
    return row ? json(mapContent(row)) : error("게시물을 찾을 수 없습니다.", 404);
  }

  if (path === "/api/admin/bootstrap" && request.method === "GET") {
    const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM admins").first<{ count: number }>();
    const principal = await getPrincipal(request, env, "admin");
    return json({ setupRequired: !count?.count, principal });
  }

  if (path === "/api/admin/setup" && request.method === "POST") {
    const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM admins").first<{ count: number }>();
    if (count?.count) return error("관리자 계정이 이미 설정되어 있습니다.", 409);
    const input = await readJson<{ email?: string; username?: string; password?: string; displayName?: string }>(request);
    const email = String(input.email ?? "").trim().toLowerCase();
    const username = String(input.username ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const displayName = String(input.displayName ?? "관리자").trim().slice(0, 50) || "관리자";
    // 이메일 또는 아이디 중 최소 하나는 반드시 입력해야 합니다.
    if (!email && !username) return error("관리자 이메일 또는 아이디 중 하나 이상을 입력해 주세요.");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return error("올바른 이메일 주소를 입력해 주세요.");
    if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) return error("아이디는 영문 소문자, 숫자, 점, 밑줄, 하이픈으로 3~30자여야 합니다.");
    if (password.length < 8) return error("관리자 비밀번호는 8자 이상이어야 합니다.");
    const hashed = await hashPassword(password);
    // email 컬럼은 NOT NULL/UNIQUE 이므로, 이메일을 비운 경우 아이디 기반의 내부 placeholder 이메일을 저장합니다.
    const emailValue = email || `${username}@admin.local`;
    const usernameValue = username || null;
    const inserted = await env.DB.prepare("INSERT INTO admins (email, username, display_name, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(emailValue, usernameValue, displayName, hashed.hash, hashed.salt, hashed.iterations).run();
    const session = await createSession(request, env, "admin", Number(inserted.meta.last_row_id));
    return json({ ok: true, principal: { id: inserted.meta.last_row_id, email: emailValue, name: displayName, type: "admin" } }, 201, session.headers);
  }

  if (path === "/api/admin/login" && request.method === "POST") {
    // loginId 는 이메일 또는 아이디 모두 허용합니다. (구버전 클라이언트 호환을 위해 email 필드도 함께 확인)
    const input = await readJson<{ loginId?: string; email?: string; password?: string }>(request);
    const loginId = String(input.loginId ?? input.email ?? "").trim().toLowerCase();
    if (!loginId) return error("아이디 또는 이메일을 입력해 주세요.");
    const isEmail = /^\S+@\S+\.\S+$/.test(loginId);
    const row = isEmail
      ? await env.DB.prepare("SELECT id, email, username, display_name, password_hash, password_salt, password_iterations FROM admins WHERE email = ?")
          .bind(loginId).first<{ id: number; email: string; username: string | null; display_name: string; password_hash: string; password_salt: string; password_iterations: number }>()
      : await env.DB.prepare("SELECT id, email, username, display_name, password_hash, password_salt, password_iterations FROM admins WHERE username = ?")
          .bind(loginId).first<{ id: number; email: string; username: string | null; display_name: string; password_hash: string; password_salt: string; password_iterations: number }>();
    if (!row || !(await verifyPassword(String(input.password ?? ""), row.password_hash, row.password_salt, row.password_iterations))) {
      return error("아이디(또는 이메일) 또는 비밀번호가 올바르지 않습니다.", 401);
    }
    const session = await createSession(request, env, "admin", row.id);
    return json({ ok: true, principal: { id: row.id, email: row.email, name: row.display_name, type: "admin" } }, 200, session.headers);
  }

  if (path === "/api/admin/logout" && request.method === "POST") {
    const token = getCookie(request, sessionCookieName(env, "admin"));
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
    return json({ ok: true }, 200, { "set-cookie": cookieHeader(request, env, "admin", "", 0) });
  }

  if (path === "/api/member/register" && request.method === "POST") {
    const input = await readJson<{ username?: string; name?: string; email?: string; password?: string }>(request);
    const username = String(input.username ?? "").trim().toLowerCase();
    const name = String(input.name ?? "").trim().slice(0, 50);
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (!/^[a-z0-9._-]{4,30}$/.test(username)) return error("아이디는 영문 소문자, 숫자, 점, 밑줄, 하이픈으로 4~30자여야 합니다.");
    if (name.length < 2) return error("이름을 입력해 주세요.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return error("올바른 이메일 주소를 입력해 주세요.");
    if (password.length < 8) return error("비밀번호는 8자 이상이어야 합니다.");
    const hashed = await hashPassword(password);
    try {
      const inserted = await env.DB.prepare("INSERT INTO members (username, name, email, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(username, name, email, hashed.hash, hashed.salt, hashed.iterations).run();
      const session = await createSession(request, env, "member", Number(inserted.meta.last_row_id));
      return json({ ok: true, principal: { id: inserted.meta.last_row_id, username, name, type: "member" } }, 201, session.headers);
    } catch {
      return error("이미 사용 중인 아이디 또는 이메일입니다.", 409);
    }
  }

  if (path === "/api/member/login" && request.method === "POST") {
    const input = await readJson<{ username?: string; password?: string }>(request);
    const username = String(input.username ?? "").trim().toLowerCase();
    const row = await env.DB.prepare("SELECT id, username, name, status, password_hash, password_salt, password_iterations FROM members WHERE username = ?")
      .bind(username).first<{ id: number; username: string; name: string; status: string; password_hash: string; password_salt: string; password_iterations: number }>();
    if (!row || row.status !== "active" || !(await verifyPassword(String(input.password ?? ""), row.password_hash, row.password_salt, row.password_iterations))) {
      return error("아이디 또는 비밀번호가 올바르지 않습니다.", 401);
    }
    const session = await createSession(request, env, "member", row.id);
    return json({ ok: true, principal: { id: row.id, username: row.username, name: row.name, type: "member" } }, 200, session.headers);
  }

  if (path === "/api/member/session" && request.method === "GET") return json({ principal: await getPrincipal(request, env, "member") });

  if (path === "/api/member/logout" && request.method === "POST") {
    const token = getCookie(request, sessionCookieName(env, "member"));
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
    return json({ ok: true }, 200, { "set-cookie": cookieHeader(request, env, "member", "", 0) });
  }

  if (path.startsWith("/api/admin/")) {
    const admin = await requireAdmin(request, env);
    if (admin instanceof Response) return admin;

    if (path === "/api/admin/site" && request.method === "PUT") {
      const settings = mergeSettings(await readJson<SiteSettings>(request));
      await env.DB.prepare(`INSERT INTO site_settings (key, value_json, updated_at) VALUES ('site', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`)
        .bind(JSON.stringify(settings)).run();
      await audit(env, admin.id, "update", "site_settings");
      return json(settings);
    }

    if (path === "/api/admin/content" && request.method === "GET") {
      const rows = await env.DB.prepare("SELECT * FROM content_items ORDER BY type, sort_order DESC, created_at DESC").all<ContentRow>();
      return json(rows.results.map(mapContent));
    }

    if (path === "/api/admin/content" && request.method === "POST") {
      const item = cleanContent(await readJson<Partial<ContentItem>>(request));
      const result = await env.DB.prepare(`INSERT INTO content_items
        (type, title, summary, body, event_date, event_location, attachment_url, image_url, published, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(item.type, item.title, item.summary, item.body, item.eventDate, item.eventLocation, item.attachmentUrl, item.imageUrl, item.published, item.sortOrder).run();
      await audit(env, admin.id, "create", "content", String(result.meta.last_row_id), item.title);
      const row = await env.DB.prepare("SELECT * FROM content_items WHERE id = ?").bind(result.meta.last_row_id).first<ContentRow>();
      return json(row ? mapContent(row) : null, 201);
    }

    const contentMatch = path.match(/^\/api\/admin\/content\/(\d+)$/);
    if (contentMatch && request.method === "PUT") {
      const id = Number(contentMatch[1]);
      const item = cleanContent(await readJson<Partial<ContentItem>>(request));
      const result = await env.DB.prepare(`UPDATE content_items SET type=?, title=?, summary=?, body=?, event_date=?, event_location=?, attachment_url=?, image_url=?, published=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(item.type, item.title, item.summary, item.body, item.eventDate, item.eventLocation, item.attachmentUrl, item.imageUrl, item.published, item.sortOrder, id).run();
      if (!result.meta.changes) return error("게시물을 찾을 수 없습니다.", 404);
      await audit(env, admin.id, "update", "content", String(id), item.title);
      const row = await env.DB.prepare("SELECT * FROM content_items WHERE id = ?").bind(id).first<ContentRow>();
      return json(row ? mapContent(row) : null);
    }

    if (contentMatch && request.method === "DELETE") {
      const id = Number(contentMatch[1]);
      const result = await env.DB.prepare("DELETE FROM content_items WHERE id = ?").bind(id).run();
      if (!result.meta.changes) return error("게시물을 찾을 수 없습니다.", 404);
      await audit(env, admin.id, "delete", "content", String(id));
      return json({ ok: true });
    }

    if (path === "/api/admin/members" && request.method === "GET") {
      const rows = await env.DB.prepare("SELECT id, username, name, email, status, created_at FROM members ORDER BY created_at DESC").all<{
        id: number; username: string; name: string; email: string; status: "active" | "disabled"; created_at: string;
      }>();
      return json(rows.results.map((row) => ({ id: row.id, username: row.username, name: row.name, email: row.email, status: row.status, createdAt: row.created_at })));
    }

    const memberMatch = path.match(/^\/api\/admin\/members\/(\d+)$/);
    if (memberMatch && request.method === "PATCH") {
      const id = Number(memberMatch[1]);
      const input = await readJson<{ status?: string; password?: string }>(request);
      if (input.status === "active" || input.status === "disabled") {
        await env.DB.prepare("UPDATE members SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(input.status, id).run();
      }
      if (input.password) {
        if (input.password.length < 8) return error("새 비밀번호는 8자 이상이어야 합니다.");
        const hashed = await hashPassword(input.password);
        await env.DB.prepare("UPDATE members SET password_hash=?, password_salt=?, password_iterations=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
          .bind(hashed.hash, hashed.salt, hashed.iterations, id).run();
      }
      await audit(env, admin.id, "update", "member", String(id));
      return json({ ok: true });
    }

    if (path === "/api/admin/password" && request.method === "PUT") {
      const input = await readJson<{ currentPassword?: string; newPassword?: string }>(request);
      if (String(input.newPassword ?? "").length < 10) return error("새 비밀번호는 10자 이상이어야 합니다.");
      const row = await env.DB.prepare("SELECT password_hash, password_salt, password_iterations FROM admins WHERE id = ?").bind(admin.id)
        .first<{ password_hash: string; password_salt: string; password_iterations: number }>();
      if (!row || !(await verifyPassword(String(input.currentPassword ?? ""), row.password_hash, row.password_salt, row.password_iterations))) return error("현재 비밀번호가 올바르지 않습니다.", 401);
      const hashed = await hashPassword(String(input.newPassword));
      await env.DB.prepare("UPDATE admins SET password_hash=?, password_salt=?, password_iterations=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(hashed.hash, hashed.salt, hashed.iterations, admin.id).run();
      await audit(env, admin.id, "update", "admin_password", String(admin.id));
      return json({ ok: true });
    }

    if (path === "/api/admin/upload" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return error("업로드할 파일을 선택해 주세요.");
      if (file.size > 10 * 1024 * 1024) return error("파일은 10MB 이하만 업로드할 수 있습니다.");
      const allowed = ["image/", "application/pdf", "application/zip", "application/x-zip-compressed", "application/msword", "application/vnd.openxmlformats-officedocument", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"];
      if (!allowed.some((type) => file.type.startsWith(type))) return error("이미지, PDF, 문서, 압축 파일만 업로드할 수 있습니다.");
      const extension = file.name.includes(".") ? `.${file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
      const key = `${file.type.startsWith("image/") ? "images" : "documents"}/${new Date().toISOString().slice(0, 10)}/${randomToken(12)}${extension}`;
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream", contentDisposition: `inline; filename="${file.name.replace(/["\r\n]/g, "_")}"` } });
      await audit(env, admin.id, "upload", "media", key, file.name);
      return json({ url: `/uploads/${key}`, name: file.name, type: file.type, size: file.size }, 201);
    }

    return error("관리자 API 경로를 찾을 수 없습니다.", 404);
  }

  return error("API 경로를 찾을 수 없습니다.", 404);
}

async function handleUpload(env: Env, path: string): Promise<Response> {
  const key = decodeURIComponent(path.replace(/^\/uploads\//, ""));
  if (!key || key.includes("..")) return error("파일 경로가 올바르지 않습니다.", 400);
  const object = await env.MEDIA.get(key);
  if (!object) return error("파일을 찾을 수 없습니다.", 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=86400");
  return new Response(object.body, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      if (url.pathname.startsWith("/uploads/") && request.method === "GET") return await handleUpload(env, url.pathname);
      return env.ASSETS.fetch(request);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "요청 처리 중 오류가 발생했습니다.";
      return error(message, 500);
    }
  },
} satisfies ExportedHandler<Env>;
