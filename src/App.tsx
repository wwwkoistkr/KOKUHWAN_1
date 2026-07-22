import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "./api";
import { AdminPage } from "./AdminPage";
import { defaultSettings, fallbackContent } from "../shared/defaults";
import type { ContentItem, ContentType, SiteSettings } from "../shared/types";

function formatDate(value: string) {
  if (!value) return "";
  return value.slice(0, 10).replaceAll("-", ".");
}

function Section({ id, title, moreLabel, items, onSelect }: { id: string; title: string; moreLabel: string; items: ContentItem[]; onSelect: (item: ContentItem) => void }) {
  return (
    <section className="content-section" id={id}>
      <header className="section-header">
        <h2>{title}</h2>
        <span>{moreLabel}</span>
      </header>
      <ul className="post-list">
        {items.slice(0, 6).map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onSelect(item)}>
              <span>[{formatDate(item.createdAt)}]</span>
              <strong>{item.title}</strong>
            </button>
          </li>
        ))}
        {!items.length && <li className="empty-row">등록된 내용이 없습니다.</li>}
      </ul>
    </section>
  );
}

function PhotoGallery({ items, onSelect }: { items: ContentItem[]; onSelect: (item: ContentItem) => void }) {
  if (!items.length) return null;
  return (
    <section className="photo-gallery" id="gallery">
      <header className="section-header blue">
        <h2>❯ 포럼 행사 사진</h2>
      </header>
      <ul className="gallery-grid">
        {items.slice(0, 12).map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onSelect(item)} title={item.title}>
              <img src={item.imageUrl} alt={item.title} loading="lazy" onError={(e) => { (e.currentTarget.closest("li") as HTMLElement).style.display = "none"; }} />
              <span className="gallery-caption">{item.title.replace(/^포럼 행사 사진 /, "")}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventFeature({ item, onSelect }: { item?: ContentItem; onSelect: (item: ContentItem) => void }) {
  if (!item) return <div className="event-empty">등록된 행사가 없습니다.</div>;
  return (
    <button className="event-feature" type="button" onClick={() => onSelect(item)}>
      <div className="event-illustration" aria-hidden="true">
        <span className="event-globe">◎</span>
        <span className="event-person person-one" />
        <span className="event-person person-two" />
      </div>
      <div className="event-copy">
        <strong>{item.title}</strong>
        <p>{item.summary}</p>
        {item.eventDate && <small>일시: {item.eventDate}</small>}
        {item.eventLocation && <small>장소: {item.eventLocation}</small>}
      </div>
    </button>
  );
}

function MemberBox({ settings, onJoin }: { settings: SiteSettings; onJoin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [principal, setPrincipal] = useState<{ name: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { api.memberSession().then((data) => setPrincipal(data.principal)).catch(() => undefined); }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      const result = await api.memberLogin(username, password);
      setPrincipal(result.principal);
      setPassword("");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "로그인하지 못했습니다."); }
  }

  async function logout() {
    await api.memberLogout();
    setPrincipal(null);
  }

  return (
    <section className="member-login" aria-label="회원 로그인">
      <h2>{settings.loginBoxTitle}</h2>
      {principal ? (
        <div className="member-welcome">
          <strong>{principal.name}님</strong>
          <span>환영합니다.</span>
          <button type="button" onClick={logout}>로그아웃</button>
        </div>
      ) : (
        <form onSubmit={login}>
          <div className="login-fields">
            <div>
              <input aria-label="회원 아이디" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
              <input aria-label="회원 비밀번호" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </div>
            <button className="login-button" type="submit">LOGIN</button>
          </div>
          {message && <p className="form-message error">{message}</p>}
          <div className="login-links">
            <button type="button" onClick={onJoin}>{settings.joinButtonLabel}</button>
            <span>{settings.findAccountLabel}</span>
          </div>
        </form>
      )}
    </section>
  );
}

function JoinDialog({ open, title, onClose }: { open: boolean; title: string; onClose: () => void }) {
  const [form, setForm] = useState({ username: "", name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.memberRegister(form);
      setMessage("회원가입과 로그인이 완료되었습니다.");
      setTimeout(() => window.location.reload(), 800);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "회원가입에 실패했습니다."); }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <h2 id="join-title">{title}</h2>
        <p>포럼 회원 서비스를 이용할 계정을 만들어 주세요.</p>
        <form className="stack-form" onSubmit={submit}>
          <label>아이디<input required minLength={4} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
          <label>이름<input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>이메일<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>비밀번호<input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-button" type="submit">회원가입</button>
        </form>
      </section>
    </div>
  );
}

function DetailDialog({ item, settings, onClose }: { item: ContentItem | null; settings: SiteSettings; onClose: () => void }) {
  if (!item) return null;
  const typeLabels: Record<ContentType, string> = {
    notice: settings.noticeSectionTitle,
    event: settings.eventSectionTitle,
    resource: settings.resourceSectionTitle,
    member: settings.memberSectionTitle,
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="dialog detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <span className="detail-type">{typeLabels[item.type]}</span>
        <h2 id="detail-title">{item.title}</h2>
        <p className="detail-date">{formatDate(item.createdAt)}</p>
        {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
        {item.summary && <p className="detail-summary">{item.summary}</p>}
        <div className="detail-body">{item.body}</div>
        {(item.eventDate || item.eventLocation) && <dl><dt>일시</dt><dd>{item.eventDate || "미정"}</dd><dt>장소</dt><dd>{item.eventLocation || "미정"}</dd></dl>}
        {item.attachmentUrl && <a className="primary-button inline-button" href={item.attachmentUrl} target="_blank" rel="noreferrer">첨부자료 열기</a>}
      </article>
    </div>
  );
}

function PublicSite() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [content, setContent] = useState<ContentItem[]>(fallbackContent);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      api.site(),
      api.content("notice", 12),
      api.content("event", 12),
      api.content("resource", 40),
      api.content("member", 12),
    ]).then(([nextSettings, notice, event, resource, member]) => {
      setSettings(nextSettings);
      const merged = [...notice, ...event, ...resource, ...member];
      setContent(merged.length ? merged : fallbackContent);
      setLogoFailed(false);
    });
  }, []);

  const grouped = useMemo(() => ({
    notice: content.filter((item) => item.type === "notice"),
    event: content.filter((item) => item.type === "event"),
    resource: content.filter((item) => item.type === "resource"),
    member: content.filter((item) => item.type === "member"),
    gallery: content.filter((item) => item.type === "resource" && item.imageUrl && item.imageUrl.includes("/uploads/gallery/")),
  }), [content]);

  const style = {
    "--page-bg": settings.theme.pageBackground,
    "--header-start": settings.theme.headerStart,
    "--header-end": settings.theme.headerEnd,
    "--nav-text": settings.theme.navText,
    "--title-text": settings.theme.titleText,
    "--accent": settings.theme.accent,
    "--accent-two": settings.theme.accentSecondary,
    "--button-bg": settings.theme.buttonBackground,
    "--button-text": settings.theme.buttonText,
    "--panel-bg": settings.theme.panelBackground,
    "--text": settings.theme.text,
    "--muted": settings.theme.mutedText,
    "--border": settings.theme.border,
    "--base-size": `${settings.theme.baseFontSize}px`,
    "--nav-size": `${settings.theme.navFontSize}px`,
    "--section-size": `${settings.theme.sectionTitleSize}px`,
    "--content-size": `${settings.theme.contentFontSize}px`,
    "--content-width": `${settings.theme.contentWidth}px`,
    "--hero-height": `${settings.theme.heroHeight}px`,
    "--corner": `${settings.theme.cornerRadius}px`,
    "--button-corner": `${settings.theme.buttonRadius}px`,
    "--shadow": `0 2px ${settings.theme.shadowStrength}px rgba(35, 69, 83, .16)`,
    "--font": settings.theme.fontFamily,
  } as React.CSSProperties;

  return (
    <div className="site-shell" style={style}>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/" aria-label="홈">
            {settings.logoImageUrl && !logoFailed
              ? <img src={settings.logoImageUrl} alt={settings.organizationName} onError={() => setLogoFailed(true)} />
              : <><strong>{settings.organizationName}</strong><span>{settings.organizationSubtitle}</span></>}
          </a>
          <nav className="utility-nav"><a href="/">{settings.homeLabel}</a><i /> <a href="#sitemap">{settings.sitemapLabel}</a></nav>
          <nav className="main-nav" aria-label="주 메뉴">
            {settings.menus.map((menu) => <a key={`${menu.label}-${menu.href}`} href={menu.href}>{menu.label}</a>)}
          </nav>
        </div>
      </header>

      <main className="page-wrap">
        <section className="hero" style={{ backgroundImage: `url(${settings.heroImageUrl || "/hero-itfu.svg"})` }} role="img" aria-label={settings.heroSlogan}>
          {settings.heroSlogan && (
            <p className="hero-slogan">{settings.heroSlogan}</p>
          )}
        </section>

        <div className="home-grid">
          <aside className="sidebar">
            <MemberBox settings={settings} onJoin={() => setJoinOpen(true)} />
            <button className="membership-card" type="button" onClick={() => setJoinOpen(true)}>
              <span className="membership-icon" aria-hidden="true">✓</span>
              <strong>{settings.membershipTitle}</strong>
              <small>{settings.membershipDescription}</small>
              <span className="membership-tiles" aria-hidden="true"><i>▥</i><i>▣</i><i>◆</i></span>
            </button>
            <section className="quick-card" id="links"><span aria-hidden="true">✚</span><strong>{settings.quickLinksTitle}</strong></section>
          </aside>

          <div className="main-content">
            <div className="top-content-grid">
              <Section id="notice" title={settings.noticeSectionTitle} moreLabel={settings.moreLabel} items={grouped.notice} onSelect={setSelected} />
              <section className="content-section" id="events">
                <header className="section-header blue"><h2>❯ {settings.eventSectionTitle}</h2></header>
                <EventFeature item={grouped.event[0]} onSelect={setSelected} />
              </section>
            </div>
            <div className="bottom-content-grid">
              <Section id="resources" title={settings.resourceSectionTitle} moreLabel={settings.moreLabel} items={grouped.resource} onSelect={setSelected} />
              <Section id="news" title={settings.memberSectionTitle} moreLabel={settings.moreLabel} items={grouped.member} onSelect={setSelected} />
            </div>
            <PhotoGallery items={grouped.gallery} onSelect={setSelected} />
          </div>
        </div>
      </main>

      <footer className="site-footer" id="sitemap">
        <div className="footer-info">
          <p className="footer-line">
            <strong>{settings.footerOrganization}</strong>
            {settings.footerAddress ? <><span className="footer-sep">/</span>{settings.footerAddress}</> : null}
          </p>
          {settings.footerContact ? <p className="footer-line footer-contact">{settings.footerContact}</p> : null}
          <small className="footer-copyright">{settings.footerCopyright}</small>
        </div>
        <a className="footer-admin-link" href="/admin">관리자</a>
      </footer>
      <JoinDialog open={joinOpen} title={settings.joinButtonLabel} onClose={() => setJoinOpen(false)} />
      <DetailDialog item={selected} settings={settings} onClose={() => setSelected(null)} />
    </div>
  );
}

export function App() {
  return window.location.pathname.startsWith("/admin") ? <AdminPage /> : <PublicSite />;
}
