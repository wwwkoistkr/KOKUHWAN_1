import { defaultSettings, fallbackContent } from "../shared/defaults";
import type { ContentItem, MemberRecord, SiteSettings } from "../shared/types";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("content-type", "application/json");
  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "요청을 처리하지 못했습니다.");
  return data as T;
}

export const api = {
  async site(): Promise<SiteSettings> {
    try { return await request<SiteSettings>("/api/site"); } catch { return defaultSettings; }
  },
  async content(): Promise<ContentItem[]> {
    try { return await request<ContentItem[]>("/api/content?limit=100"); } catch { return fallbackContent; }
  },
  memberSession: () => request<{ principal: { id: number; username: string; name: string } | null }>("/api/member/session"),
  memberLogin: (username: string, password: string) => request<{ principal: { id: number; username: string; name: string } }>("/api/member/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  memberRegister: (input: { username: string; name: string; email: string; password: string }) => request<{ principal: { id: number; username: string; name: string } }>("/api/member/register", { method: "POST", body: JSON.stringify(input) }),
  memberLogout: () => request<{ ok: true }>("/api/member/logout", { method: "POST", body: "{}" }),
  adminBootstrap: () => request<{ setupRequired: boolean; principal: { id: number; email: string; name: string } | null }>("/api/admin/bootstrap"),
  adminSetup: (input: { email: string; displayName: string; password: string }) => request("/api/admin/setup", { method: "POST", body: JSON.stringify(input) }),
  adminLogin: (email: string, password: string) => request("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  adminLogout: () => request("/api/admin/logout", { method: "POST", body: "{}" }),
  adminContent: () => request<ContentItem[]>("/api/admin/content"),
  createContent: (item: Partial<ContentItem>) => request<ContentItem>("/api/admin/content", { method: "POST", body: JSON.stringify(item) }),
  updateContent: (id: number, item: Partial<ContentItem>) => request<ContentItem>(`/api/admin/content/${id}`, { method: "PUT", body: JSON.stringify(item) }),
  deleteContent: (id: number) => request<{ ok: true }>(`/api/admin/content/${id}`, { method: "DELETE", body: "{}" }),
  updateSite: (settings: SiteSettings) => request<SiteSettings>("/api/admin/site", { method: "PUT", body: JSON.stringify(settings) }),
  members: () => request<MemberRecord[]>("/api/admin/members"),
  updateMember: (id: number, input: { status?: string; password?: string }) => request(`/api/admin/members/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  changeAdminPassword: (currentPassword: string, newPassword: string) => request("/api/admin/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string; name: string; type: string; size: number }>("/api/admin/upload", { method: "POST", body: form });
  },
};
