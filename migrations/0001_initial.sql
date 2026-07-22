PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '관리자',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 210000,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 210000,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  principal_type TEXT NOT NULL CHECK (principal_type IN ('admin', 'member')),
  principal_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS content_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('notice', 'event', 'resource', 'member')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL DEFAULT '',
  event_location TEXT NOT NULL DEFAULT '',
  attachment_url TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_type_published ON content_items(type, published, sort_order DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO content_items (type, title, summary, body, published, sort_order, created_at, updated_at) VALUES
('notice', '북중 접경지역 답사 참가 안내', '포럼 회원 여러분의 많은 참여 바랍니다.', '행사 세부 내용은 관리자 모드에서 수정할 수 있습니다.', 1, 10, '2026-04-08', '2026-04-08'),
('notice', '생성형 AI 이해 활용 기본과정', 'ICT 역량 강화를 위한 교육과정 안내입니다.', '교육 일정과 신청 방법을 확인해 주세요.', 1, 9, '2026-03-30', '2026-03-30'),
('notice', '2025년 연간기부금 모금액 활용실적 명세서', '기부금 활용실적을 공개합니다.', '첨부자료를 확인해 주세요.', 1, 8, '2026-02-09', '2026-02-09'),
('event', '제97차 조찬 간담회 개최 안내', 'AI가 해커가 되는 시대, 우리는 어떻게 대응할 것인가?', '주제 발표와 토론으로 진행되는 포럼 조찬 간담회입니다.', 1, 10, '2026-06-01', '2026-06-01'),
('resource', '제97차 조찬간담회 발표자료', '행사 발표자료를 내려받을 수 있습니다.', '자료 파일은 관리자 모드에서 등록할 수 있습니다.', 1, 10, '2026-07-01', '2026-07-01'),
('member', '제97차 조찬간담회 언론보도', '회원과 포럼의 최근 활동 소식입니다.', '관련 소식을 등록해 주세요.', 1, 10, '2026-07-01', '2026-07-01');

INSERT OR IGNORE INTO site_settings (key, value_json) VALUES ('site', '{}');
