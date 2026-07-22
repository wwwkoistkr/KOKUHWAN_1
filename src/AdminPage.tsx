import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { api } from "./api";
import { defaultSettings } from "../shared/defaults";
import type { ContentItem, ContentType, MemberRecord, SiteSettings, SiteTheme } from "../shared/types";

type AdminTab = "dashboard" | "content" | "appearance" | "site" | "members" | "security";

const contentLabels: Record<ContentType, string> = { notice: "공지사항", event: "포럼행사", resource: "자료실", member: "회원동정" };
const emptyItem: Omit<ContentItem, "id" | "createdAt" | "updatedAt"> = {
  type: "notice", title: "", summary: "", body: "", eventDate: "", eventLocation: "", attachmentUrl: "", imageUrl: "", published: true, sortOrder: 0,
};

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}{help && <small>{help}</small>}</label>;
}

function AdminAuth({ setupRequired, onSuccess }: { setupRequired: boolean; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("관리자");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (setupRequired && password !== confirmPassword) { setError("비밀번호 확인이 일치하지 않습니다."); return; }
    setBusy(true); setError("");
    try {
      if (setupRequired) await api.adminSetup({ email, displayName, password });
      else await api.adminLogin(email, password);
      onSuccess();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "로그인하지 못했습니다."); }
    finally { setBusy(false); }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <a className="admin-back" href="/">← 홈페이지</a>
        <div className="admin-auth-mark">ICT</div>
        <h1>{setupRequired ? "최초 관리자 설정" : "관리자 로그인"}</h1>
        <p>{setupRequired ? "이 사이트를 관리할 첫 번째 계정을 만들어 주세요. 비밀번호는 소스 코드에 저장되지 않습니다." : "콘텐츠와 홈페이지 디자인을 관리합니다."}</p>
        <form className="stack-form" onSubmit={submit}>
          {setupRequired && <Field label="관리자 이름"><input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>}
          <Field label="이메일"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
          <Field label="비밀번호" help={setupRequired ? "10자 이상 입력해 주세요." : undefined}><input required type="password" minLength={setupRequired ? 10 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={setupRequired ? "new-password" : "current-password"} /></Field>
          {setupRequired && <Field label="비밀번호 확인"><input required type="password" minLength={10} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" /></Field>}
          {error && <p className="admin-alert error">{error}</p>}
          <button className="admin-primary" type="submit" disabled={busy}>{busy ? "처리 중…" : setupRequired ? "관리 시작" : "로그인"}</button>
        </form>
      </section>
    </main>
  );
}

function UploadField({ label, value, onChange, accept }: { label: string; value: string; onChange: (value: string) => void; accept?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try { onChange((await api.upload(file)).url); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "업로드에 실패했습니다."); }
    finally { setBusy(false); }
  }
  return (
    <Field label={label} help={error || "10MB 이하 이미지·PDF·문서·압축파일"}>
      <div className="upload-field">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="이미지 주소 또는 업로드 결과" />
        <label className="admin-secondary file-button">{busy ? "업로드 중…" : "파일 선택"}<input type="file" accept={accept} disabled={busy} onChange={(e) => upload(e.target.files?.[0])} /></label>
      </div>
      {value && accept?.includes("image") && <img className="upload-preview" src={value} alt="업로드 미리보기" />}
    </Field>
  );
}

function ContentEditor({ item, onSave, onCancel }: { item: Partial<ContentItem>; onSave: (item: Partial<ContentItem>) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave(form); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "저장하지 못했습니다."); }
    finally { setBusy(false); }
  }

  return (
    <form className="editor-panel" onSubmit={submit}>
      <div className="panel-title"><div><span>게시물 편집</span><h2>{form.id ? "내용 수정" : "새 내용 등록"}</h2></div><button type="button" onClick={onCancel}>×</button></div>
      <div className="form-grid two">
        <Field label="분류"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContentType })}>{Object.entries(contentLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
        <Field label="정렬 순서" help="숫자가 클수록 먼저 표시됩니다."><input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></Field>
      </div>
      <Field label="제목"><input required maxLength={200} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="요약"><textarea rows={2} value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
      <Field label="본문"><textarea rows={9} value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
      {form.type === "event" && <div className="form-grid two"><Field label="행사 일시"><input value={form.eventDate ?? ""} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} placeholder="2026-06-25 07:00" /></Field><Field label="행사 장소"><input value={form.eventLocation ?? ""} onChange={(e) => setForm({ ...form, eventLocation: e.target.value })} /></Field></div>}
      <UploadField label="대표 이미지" accept="image/*" value={form.imageUrl ?? ""} onChange={(value) => setForm({ ...form, imageUrl: value })} />
      <UploadField label="첨부자료" value={form.attachmentUrl ?? ""} onChange={(value) => setForm({ ...form, attachmentUrl: value })} />
      <label className="toggle-field"><input type="checkbox" checked={form.published !== false} onChange={(e) => setForm({ ...form, published: e.target.checked })} /><span>홈페이지에 공개</span></label>
      {error && <p className="admin-alert error">{error}</p>}
      <div className="editor-actions"><button className="admin-secondary" type="button" onClick={onCancel}>취소</button><button className="admin-primary" type="submit" disabled={busy}>{busy ? "저장 중…" : "저장"}</button></div>
    </form>
  );
}

const colorFields: Array<[keyof SiteTheme, string]> = [
  ["pageBackground", "페이지 배경"], ["headerStart", "헤더 시작색"], ["headerEnd", "헤더 끝색"], ["navText", "메뉴 글자"],
  ["titleText", "로고·제목"], ["accent", "강조색 1"], ["accentSecondary", "강조색 2"], ["buttonBackground", "버튼 배경"],
  ["buttonText", "버튼 글자"], ["panelBackground", "패널 배경"], ["text", "본문 글자"], ["mutedText", "보조 글자"], ["border", "테두리"],
];
const numberFields: Array<[keyof SiteTheme, string, number, number, string]> = [
  ["baseFontSize", "기본 글자 크기", 11, 22, "px"], ["navFontSize", "메뉴 글자 크기", 11, 24, "px"], ["sectionTitleSize", "제목 글자 크기", 12, 28, "px"],
  ["contentFontSize", "게시물 글자 크기", 11, 22, "px"], ["contentWidth", "전체 폭", 820, 1280, "px"], ["heroHeight", "메인 이미지 높이", 180, 500, "px"],
  ["cornerRadius", "패널 모서리", 0, 30, "px"], ["buttonRadius", "버튼 모서리", 0, 30, "px"], ["shadowStrength", "그림자 크기", 0, 30, ""],
];

function AppearancePanel({ settings, setSettings, onSave, busy }: { settings: SiteSettings; setSettings: (value: SiteSettings) => void; onSave: () => void; busy: boolean }) {
  function theme<K extends keyof SiteTheme>(key: K, value: SiteTheme[K]) { setSettings({ ...settings, theme: { ...settings.theme, [key]: value } }); }
  function preset(kind: "classic" | "clean" | "dark") {
    const presets = {
      classic: defaultSettings.theme,
      clean: { ...defaultSettings.theme, pageBackground: "#f5f8fa", headerStart: "#ffffff", headerEnd: "#d9f4f7", navText: "#134b62", accent: "#ef8b32", panelBackground: "#ffffff", cornerRadius: 16, buttonRadius: 8, shadowStrength: 18 },
      dark: { ...defaultSettings.theme, pageBackground: "#17232d", headerStart: "#102f44", headerEnd: "#26647a", navText: "#effbff", titleText: "#ffffff", panelBackground: "#21313d", text: "#edf4f7", mutedText: "#b8c6ce", border: "#39515f", buttonBackground: "#d98b32" },
    };
    setSettings({ ...settings, theme: presets[kind] });
  }
  return (
    <section className="admin-card">
      <div className="admin-card-heading"><div><span>DESIGN SYSTEM</span><h2>색상·글자·버튼·레이아웃</h2><p>수정한 값은 공개 홈페이지 전체에 적용됩니다.</p></div><button className="admin-primary" onClick={onSave} disabled={busy}>{busy ? "저장 중…" : "디자인 저장"}</button></div>
      <div className="preset-row"><button onClick={() => preset("classic")}>원본형 하늘색</button><button onClick={() => preset("clean")}>밝은 현대형</button><button onClick={() => preset("dark")}>어두운 테마</button></div>
      <h3 className="subsection-title">전체 색상</h3>
      <div className="color-grid">{colorFields.map(([key, label]) => <label className="color-control" key={key}><span>{label}</span><div><input type="color" value={String(settings.theme[key])} onChange={(e) => theme(key, e.target.value as never)} /><input value={String(settings.theme[key])} onChange={(e) => theme(key, e.target.value as never)} /></div></label>)}</div>
      <h3 className="subsection-title">크기와 모양</h3>
      <div className="range-grid">{numberFields.map(([key, label, min, max, unit]) => <label className="range-control" key={key}><span>{label}<b>{String(settings.theme[key])}{unit}</b></span><input type="range" min={min} max={max} value={Number(settings.theme[key])} onChange={(e) => theme(key, Number(e.target.value) as never)} /></label>)}</div>
      <Field label="홈페이지 글꼴"><select value={settings.theme.fontFamily} onChange={(e) => theme("fontFamily", e.target.value)}><option value="Arial, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif">맑은 고딕 계열</option><option value="Georgia, 'Batang', serif">명조 계열</option><option value="'Arial Narrow', Arial, sans-serif">좁은 고딕 계열</option></select></Field>
    </section>
  );
}

function SitePanel({ settings, setSettings, onSave, busy }: { settings: SiteSettings; setSettings: (value: SiteSettings) => void; onSave: () => void; busy: boolean }) {
  const set = (key: keyof SiteSettings, value: SiteSettings[keyof SiteSettings]) => setSettings({ ...settings, [key]: value });
  return (
    <section className="admin-card">
      <div className="admin-card-heading"><div><span>SITE CONTENT</span><h2>홈페이지 문구·이미지·메뉴</h2><p>원본의 모든 주요 텍스트와 이미지를 이곳에서 바꿀 수 있습니다.</p></div><button className="admin-primary" onClick={onSave} disabled={busy}>{busy ? "저장 중…" : "내용 저장"}</button></div>
      <div className="form-grid two"><Field label="단체명"><input value={settings.organizationName} onChange={(e) => set("organizationName", e.target.value)} /></Field><Field label="단체명 보조 문구"><input value={settings.organizationSubtitle} onChange={(e) => set("organizationSubtitle", e.target.value)} /></Field></div>
      <Field label="메인 슬로건"><input value={settings.heroSlogan} onChange={(e) => set("heroSlogan", e.target.value)} /></Field>
      <UploadField label="로고 이미지" accept="image/*" value={settings.logoImageUrl} onChange={(value) => set("logoImageUrl", value)} />
      <UploadField label="메인 배너 이미지" accept="image/*" value={settings.heroImageUrl} onChange={(value) => set("heroImageUrl", value)} />
      <h3 className="subsection-title">상단 메뉴</h3>
      <div className="menu-editor">{settings.menus.map((menu, index) => <div key={index}><input aria-label={`메뉴 ${index + 1} 이름`} value={menu.label} onChange={(e) => { const menus = [...settings.menus]; menus[index] = { ...menu, label: e.target.value }; set("menus", menus); }} /><input aria-label={`메뉴 ${index + 1} 주소`} value={menu.href} onChange={(e) => { const menus = [...settings.menus]; menus[index] = { ...menu, href: e.target.value }; set("menus", menus); }} /><button type="button" onClick={() => set("menus", settings.menus.filter((_, i) => i !== index))}>삭제</button></div>)}</div>
      <button className="admin-secondary" type="button" onClick={() => set("menus", [...settings.menus, { label: "새 메뉴", href: "#new" }])}>+ 메뉴 추가</button>
      <h3 className="subsection-title">회원가입 안내</h3>
      <div className="form-grid two"><Field label="안내 제목"><input value={settings.membershipTitle} onChange={(e) => set("membershipTitle", e.target.value)} /></Field><Field label="안내 설명"><input value={settings.membershipDescription} onChange={(e) => set("membershipDescription", e.target.value)} /></Field></div>
      <h3 className="subsection-title">하단 정보</h3>
      <div className="form-grid two"><Field label="하단 단체명"><input value={settings.footerOrganization} onChange={(e) => set("footerOrganization", e.target.value)} /></Field><Field label="주소"><input value={settings.footerAddress} onChange={(e) => set("footerAddress", e.target.value)} /></Field><Field label="연락처"><input value={settings.footerContact} onChange={(e) => set("footerContact", e.target.value)} /></Field><Field label="저작권 문구"><input value={settings.footerCopyright} onChange={(e) => set("footerCopyright", e.target.value)} /></Field></div>
    </section>
  );
}

function MembersPanel({ members, reload }: { members: MemberRecord[]; reload: () => Promise<void> }) {
  const [passwordFor, setPasswordFor] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  async function status(member: MemberRecord) { await api.updateMember(member.id, { status: member.status === "active" ? "disabled" : "active" }); await reload(); }
  async function reset(id: number) { if (password.length < 8) return; await api.updateMember(id, { password }); setPassword(""); setPasswordFor(null); }
  return (
    <section className="admin-card">
      <div className="admin-card-heading"><div><span>MEMBERS</span><h2>회원 계정 관리</h2><p>가입 회원의 이용 상태와 비밀번호를 관리합니다.</p></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>아이디</th><th>이름</th><th>이메일</th><th>상태</th><th>가입일</th><th>관리</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td>{member.username}</td><td>{member.name}</td><td>{member.email}</td><td><span className={`status-pill ${member.status}`}>{member.status === "active" ? "이용 중" : "중지"}</span></td><td>{member.createdAt.slice(0, 10)}</td><td><button onClick={() => status(member)}>{member.status === "active" ? "이용 중지" : "이용 재개"}</button><button onClick={() => setPasswordFor(member.id)}>비밀번호 재설정</button>{passwordFor === member.id && <div className="inline-reset"><input type="password" minLength={8} placeholder="새 비밀번호 8자 이상" value={password} onChange={(e) => setPassword(e.target.value)} /><button onClick={() => reset(member.id)}>적용</button></div>}</td></tr>)}</tbody></table>{!members.length && <p className="empty-state">가입한 회원이 없습니다.</p>}</div>
    </section>
  );
}

function SecurityPanel() {
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [message, setMessage] = useState("");
  async function submit(e: FormEvent) { e.preventDefault(); if (newPassword !== confirm) { setMessage("새 비밀번호 확인이 일치하지 않습니다."); return; } try { await api.changeAdminPassword(currentPassword, newPassword); setCurrentPassword(""); setNewPassword(""); setConfirm(""); setMessage("비밀번호를 변경했습니다."); } catch (caught) { setMessage(caught instanceof Error ? caught.message : "변경하지 못했습니다."); } }
  return <section className="admin-card security-card"><div className="admin-card-heading"><div><span>SECURITY</span><h2>관리자 비밀번호 변경</h2><p>안전을 위해 다른 사이트와 겹치지 않는 긴 비밀번호를 사용하세요.</p></div></div><form className="stack-form narrow" onSubmit={submit}><Field label="현재 비밀번호"><input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></Field><Field label="새 비밀번호"><input required type="password" minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Field><Field label="새 비밀번호 확인"><input required type="password" minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>{message && <p className="admin-alert">{message}</p>}<button className="admin-primary" type="submit">비밀번호 변경</button></form></section>;
}

function Dashboard({ content, members, setTab }: { content: ContentItem[]; members: MemberRecord[]; setTab: (tab: AdminTab) => void }) {
  const counts = useMemo(() => Object.fromEntries(Object.keys(contentLabels).map((type) => [type, content.filter((item) => item.type === type).length])), [content]);
  return <><div className="metric-grid">{Object.entries(contentLabels).map(([type, label]) => <button className="metric-card" key={type} onClick={() => setTab("content")}><span>{label}</span><strong>{counts[type]}</strong><small>등록된 항목</small></button>)}<button className="metric-card member-metric" onClick={() => setTab("members")}><span>회원</span><strong>{members.length}</strong><small>가입 계정</small></button></div><div className="dashboard-grid"><section className="admin-card"><div className="admin-card-heading"><div><span>RECENT CONTENT</span><h2>최근 등록 내용</h2></div><button className="admin-secondary" onClick={() => setTab("content")}>전체 관리</button></div><ul className="recent-list">{content.slice(0, 6).map((item) => <li key={item.id}><span>{contentLabels[item.type]}</span><strong>{item.title}</strong><small>{item.updatedAt.slice(0, 10)}</small></li>)}</ul></section><section className="admin-card quick-actions"><span>QUICK START</span><h2>빠른 관리</h2><button onClick={() => setTab("content")}>＋ 새 게시물 등록</button><button onClick={() => setTab("appearance")}>◐ 홈페이지 색상 변경</button><button onClick={() => setTab("site")}>▣ 메인 이미지·문구 변경</button><a href="/" target="_blank">↗ 공개 홈페이지 보기</a></section></div></>;
}

export function AdminPage() {
  const [loading, setLoading] = useState(true); const [setupRequired, setSetupRequired] = useState(false); const [authenticated, setAuthenticated] = useState(false); const [name, setName] = useState("관리자");
  const [tab, setTab] = useState<AdminTab>("dashboard"); const [content, setContent] = useState<ContentItem[]>([]); const [settings, setSettings] = useState<SiteSettings>(defaultSettings); const [members, setMembers] = useState<MemberRecord[]>([]);
  const [editing, setEditing] = useState<Partial<ContentItem> | null>(null); const [filter, setFilter] = useState<ContentType | "all">("all"); const [saving, setSaving] = useState(false); const [toast, setToast] = useState("");

  async function bootstrap() { setLoading(true); try { const state = await api.adminBootstrap(); setSetupRequired(state.setupRequired); setAuthenticated(Boolean(state.principal)); if (state.principal) setName(state.principal.name); } finally { setLoading(false); } }
  async function loadAdminData() { const [items, site, memberRows] = await Promise.all([api.adminContent(), api.site(), api.members()]); setContent(items); setSettings(site); setMembers(memberRows); }
  useEffect(() => { bootstrap(); }, []);
  useEffect(() => { if (authenticated) loadAdminData().catch((caught) => setToast(caught instanceof Error ? caught.message : "자료를 불러오지 못했습니다.")); }, [authenticated]);
  async function saveContent(item: Partial<ContentItem>) { if (item.id) await api.updateContent(item.id, item); else await api.createContent(item); setEditing(null); setContent(await api.adminContent()); setToast("게시물을 저장했습니다."); }
  async function remove(item: ContentItem) { if (!window.confirm(`'${item.title}' 게시물을 삭제하시겠습니까?`)) return; await api.deleteContent(item.id); setContent(await api.adminContent()); setToast("게시물을 삭제했습니다."); }
  async function saveSite() { setSaving(true); try { setSettings(await api.updateSite(settings)); setToast("홈페이지 설정을 저장했습니다."); } finally { setSaving(false); } }
  async function logout() { await api.adminLogout(); setAuthenticated(false); }

  if (loading) return <div className="admin-loading">관리자 모드를 준비하고 있습니다…</div>;
  if (!authenticated) return <AdminAuth setupRequired={setupRequired} onSuccess={bootstrap} />;
  const filtered = filter === "all" ? content : content.filter((item) => item.type === filter);
  const nav: Array<[AdminTab, string, string]> = [["dashboard", "⌂", "대시보드"], ["content", "▤", "게시물·행사·자료"], ["appearance", "◐", "색상·글꼴·버튼"], ["site", "▣", "이미지·문구·메뉴"], ["members", "♙", "회원 관리"], ["security", "◇", "보안 설정"]];
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar"><a className="admin-logo" href="/admin"><span>ICT</span><div><strong>홈페이지 관리자</strong><small>통합 관리 모드</small></div></a><nav>{nav.map(([value, icon, label]) => <button className={tab === value ? "active" : ""} key={value} onClick={() => { setTab(value); setEditing(null); }}><i>{icon}</i>{label}</button>)}</nav><div className="admin-side-footer"><a href="/" target="_blank">홈페이지 보기 ↗</a><button onClick={logout}>로그아웃</button></div></aside>
      <main className="admin-main"><header className="admin-topbar"><div><small>ADMINISTRATION</small><h1>{nav.find(([value]) => value === tab)?.[2]}</h1></div><div className="admin-user"><span>{name.slice(0, 1)}</span><div><strong>{name}</strong><small>최고 관리자</small></div></div></header>
        <div className="admin-workspace">
          {toast && <div className="toast" onAnimationEnd={() => setToast("")}>{toast}</div>}
          {tab === "dashboard" && <Dashboard content={content} members={members} setTab={setTab} />}
          {tab === "content" && <><section className="admin-card"><div className="admin-card-heading"><div><span>CONTENT MANAGER</span><h2>게시물·행사·자료 통합 관리</h2><p>분류를 선택해 홈페이지 각 영역에 표시할 내용을 등록합니다.</p></div><button className="admin-primary" onClick={() => setEditing({ ...emptyItem })}>+ 새 내용 등록</button></div><div className="filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>전체 {content.length}</button>{Object.entries(contentLabels).map(([value, label]) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value as ContentType)}>{label} {content.filter((item) => item.type === value).length}</button>)}</div><div className="admin-table-wrap"><table className="admin-table content-table"><thead><tr><th>분류</th><th>제목</th><th>공개</th><th>정렬</th><th>수정일</th><th>관리</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><span className={`type-pill ${item.type}`}>{contentLabels[item.type]}</span></td><td><strong>{item.title}</strong><small>{item.summary}</small></td><td>{item.published ? "공개" : "비공개"}</td><td>{item.sortOrder}</td><td>{item.updatedAt.slice(0, 10)}</td><td><button onClick={() => setEditing(item)}>수정</button><button className="danger" onClick={() => remove(item)}>삭제</button></td></tr>)}</tbody></table></div></section>{editing && <div className="editor-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}><ContentEditor item={editing} onSave={saveContent} onCancel={() => setEditing(null)} /></div>}</>}
          {tab === "appearance" && <AppearancePanel settings={settings} setSettings={setSettings} onSave={saveSite} busy={saving} />}
          {tab === "site" && <SitePanel settings={settings} setSettings={setSettings} onSave={saveSite} busy={saving} />}
          {tab === "members" && <MembersPanel members={members} reload={async () => setMembers(await api.members())} />}
          {tab === "security" && <SecurityPanel />}
        </div>
      </main>
    </div>
  );
}
