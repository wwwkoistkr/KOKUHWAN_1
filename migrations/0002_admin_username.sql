-- 관리자 로그인에 이메일과 함께 아이디(username)도 사용할 수 있도록 컬럼 추가.
-- 기존 관리자 계정에는 영향을 주지 않으며, username 은 선택 값(NULL 허용)입니다.
ALTER TABLE admins ADD COLUMN username TEXT;

-- 아이디는 대소문자 구분 없이 유일해야 하므로 부분 유니크 인덱스를 사용합니다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_username ON admins(username) WHERE username IS NOT NULL;
