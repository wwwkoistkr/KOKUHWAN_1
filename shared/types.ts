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
