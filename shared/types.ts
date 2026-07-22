export type ContentType = "notice" | "event" | "resource" | "member";

export interface ContentItem {
  id: number;
  type: ContentType;
  title: string;
  summary: string;
  body: string;
  eventDate: string;
  eventLocation: string;
  attachmentUrl: string;
  imageUrl: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  label: string;
  href: string;
}

export interface SiteTheme {
  pageBackground: string;
  headerStart: string;
  headerEnd: string;
  navText: string;
  titleText: string;
  accent: string;
  accentSecondary: string;
  buttonBackground: string;
  buttonText: string;
  panelBackground: string;
  text: string;
  mutedText: string;
  border: string;
  baseFontSize: number;
  navFontSize: number;
  sectionTitleSize: number;
  contentFontSize: number;
  contentWidth: number;
  heroHeight: number;
  cornerRadius: number;
  buttonRadius: number;
  shadowStrength: number;
  fontFamily: string;
}

export interface SiteSettings {
  organizationName: string;
  organizationSubtitle: string;
  heroSlogan: string;
  heroImageUrl: string;
  logoImageUrl: string;
  membershipTitle: string;
  membershipDescription: string;
  footerOrganization: string;
  footerAddress: string;
  footerContact: string;
  footerCopyright: string;
  // 섹션 제목 (홈페이지 4개 영역 이름)
  noticeSectionTitle: string;
  eventSectionTitle: string;
  resourceSectionTitle: string;
  memberSectionTitle: string;
  // 사이드바 · 로그인 영역 문구
  loginBoxTitle: string;
  joinButtonLabel: string;
  findAccountLabel: string;
  quickLinksTitle: string;
  moreLabel: string;
  // 상단 유틸리티 문구
  homeLabel: string;
  sitemapLabel: string;
  menus: MenuItem[];
  theme: SiteTheme;
}

export interface MemberRecord {
  id: number;
  username: string;
  name: string;
  email: string;
  status: "active" | "disabled";
  createdAt: string;
}
