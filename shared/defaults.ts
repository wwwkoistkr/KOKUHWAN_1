import type { ContentItem, SiteSettings } from "./types";

export const defaultSettings: SiteSettings = {
  organizationName: "(사)동북아공동체ICT포럼",
  organizationSubtitle: "(구 통일IT포럼)",
  heroSlogan: "남북 IT교류협력 활성화, 통일IT포럼이 주도하겠습니다.",
  heroImageUrl: "/hero-itfu.svg",
  logoImageUrl: "",
  membershipTitle: "개인 / 기관회원 가입안내",
  membershipDescription: "포럼의 회원이 되어 동북아 ICT 교류와 협력에 함께해 주세요.",
  footerOrganization: "(사)동북아공동체ICT포럼",
  footerAddress: "주소: (우) 05547 서울특별시 송파구 올림픽로32길 21-9 2층",
  footerContact: "전화: 02-521-8171 / 팩스: 02-521-8730 / 이메일: bismak0308@naver.com",
  footerCopyright: "Copyright (사)동북아공동체ICT포럼. All rights reserved.",
  noticeSectionTitle: "공지사항",
  eventSectionTitle: "포럼행사",
  resourceSectionTitle: "자료실",
  memberSectionTitle: "회원동정",
  loginBoxTitle: "MEMBER LOGIN",
  joinButtonLabel: "e-멤버스 회원가입",
  findAccountLabel: "아이디/비번찾기",
  quickLinksTitle: "관련기관 바로가기",
  moreLabel: "·· MORE",
  homeLabel: "HOME",
  sitemapLabel: "SITEMAP",
  menus: [
    { label: "포럼소개", href: "#about" },
    { label: "포럼행사", href: "#events" },
    { label: "포럼소식", href: "#news" },
    { label: "게시판", href: "#notice" },
    { label: "자료실", href: "#resources" },
    { label: "관련사이트", href: "#links" }
  ],
  theme: {
    pageBackground: "#ffffff",
    headerStart: "#58c6df",
    headerEnd: "#9be5eb",
    navText: "#175c7f",
    titleText: "#073f82",
    accent: "#e69a26",
    accentSecondary: "#54a4c4",
    buttonBackground: "#8daec7",
    buttonText: "#ffffff",
    panelBackground: "#ffffff",
    text: "#4e5660",
    mutedText: "#7a8189",
    border: "#d8e0e5",
    baseFontSize: 14,
    navFontSize: 15,
    sectionTitleSize: 17,
    contentFontSize: 13,
    contentWidth: 1000,
    heroHeight: 286,
    cornerRadius: 12,
    buttonRadius: 2,
    shadowStrength: 12,
    fontFamily: "Arial, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
  }
};

export const fallbackContent: ContentItem[] = [
  { id: 1, type: "notice", title: "북중 접경지역 답사 참가 안내", summary: "포럼 회원 여러분의 많은 참여 바랍니다.", body: "행사 세부 내용은 관리자 모드에서 수정할 수 있습니다.", eventDate: "", eventLocation: "", attachmentUrl: "", imageUrl: "", published: true, sortOrder: 10, createdAt: "2026-04-08", updatedAt: "2026-04-08" },
  { id: 2, type: "notice", title: "생성형 AI 이해 활용 기본과정", summary: "ICT 역량 강화를 위한 교육과정 안내입니다.", body: "교육 일정과 신청 방법을 확인해 주세요.", eventDate: "", eventLocation: "", attachmentUrl: "", imageUrl: "", published: true, sortOrder: 9, createdAt: "2026-03-30", updatedAt: "2026-03-30" },
  { id: 3, type: "notice", title: "2025년 연간기부금 모금액 활용실적 명세서", summary: "기부금 활용실적을 공개합니다.", body: "첨부자료를 확인해 주세요.", eventDate: "", eventLocation: "", attachmentUrl: "", imageUrl: "", published: true, sortOrder: 8, createdAt: "2026-02-09", updatedAt: "2026-02-09" },
  { id: 4, type: "event", title: "제97차 조찬 간담회 개최 안내", summary: "AI가 해커가 되는 시대, 우리는 어떻게 대응할 것인가?", body: "주제 발표와 토론으로 진행되는 포럼 조찬 간담회입니다.", eventDate: "2026-06-25 07:00", eventLocation: "서울 포럼 회의장", attachmentUrl: "", imageUrl: "", published: true, sortOrder: 10, createdAt: "2026-06-01", updatedAt: "2026-06-01" },
  { id: 5, type: "resource", title: "제97차 조찬간담회 발표자료", summary: "행사 발표자료를 내려받을 수 있습니다.", body: "자료 파일은 관리자 모드에서 등록할 수 있습니다.", eventDate: "", eventLocation: "", attachmentUrl: "", imageUrl: "", published: true, sortOrder: 10, createdAt: "2026-07-01", updatedAt: "2026-07-01" },
  { id: 6, type: "member", title: "제97차 조찬간담회 언론보도", summary: "회원과 포럼의 최근 활동 소식입니다.", body: "관련 소식을 등록해 주세요.", eventDate: "", eventLocation: "", attachmentUrl: "", imageUrl: "", published: true, sortOrder: 10, createdAt: "2026-07-01", updatedAt: "2026-07-01" }
];
