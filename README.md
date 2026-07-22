# 동북아공동체ICT포럼 홈페이지

기존 `http://itfu.kr/` 홈페이지의 화면 배치와 분위기를 최대한 유지하면서, 모바일 대응과 통합 관리자 기능을 추가한 Cloudflare용 풀스택 홈페이지입니다.

## 구현 범위

- 기존형 하늘색 헤더, 6개 메뉴, 대형 배너, 좌측 회원 로그인 배치
- 공지사항, 포럼행사, 자료실, 회원동정 게시물 상세 보기
- 회원가입, 로그인, 로그아웃과 관리자 회원 이용 중지·비밀번호 재설정
- 관리자 최초 설정과 안전한 PBKDF2 비밀번호 저장
- 게시물·행사·자료·회원동정 등록, 수정, 공개/비공개, 정렬, 삭제
- 색상 13종, 글자 크기, 홈페이지 폭, 배너 높이, 모서리, 버튼, 그림자, 글꼴 관리
- 로고, 메인 배너, 게시물 이미지, 첨부자료 업로드
- 단체명, 슬로건, 메뉴, 회원안내, 주소, 연락처, 저작권 문구 관리
- PC·태블릿·모바일 반응형 화면
- 관리자 작업 감사 로그와 동일 출처 요청 검사

## 기술 구성

- React + TypeScript + Vite
- Cloudflare Worker API
- Cloudflare D1: 관리자, 회원, 게시물, 설정, 세션, 감사 기록
- Cloudflare R2: 이미지와 첨부파일
- Cloudflare Workers Static Assets

## 로컬 실행

Node.js 20 이상을 권장합니다.

```powershell
npm install
npm run db:local
npm run dev
```

- 공개 홈페이지: `http://127.0.0.1:5173/`
- 관리자 모드: `http://127.0.0.1:5173/admin`

처음 `/admin`에 들어가면 첫 관리자 이메일과 비밀번호를 직접 설정합니다. 소스 코드에는 기본 관리자 비밀번호가 없습니다.

## Cloudflare 배포 준비

1. Cloudflare 로그인

   ```powershell
   npx wrangler login
   ```

2. D1 데이터베이스 생성

   ```powershell
   npx wrangler d1 create itfu-cms
   ```

3. 출력된 `database_id`를 `wrangler.jsonc`의 `d1_databases[0].database_id`에 입력

4. R2 버킷 생성

   ```powershell
   npx wrangler r2 bucket create itfu-media
   ```

5. 원격 데이터베이스 구성

   ```powershell
   npm run db:remote
   ```

6. 배포

   ```powershell
   npm run deploy
   ```

7. Cloudflare 대시보드에서 사용자 도메인을 Worker에 연결하고 HTTPS 동작 확인

## GitHub Actions를 통한 수동 배포

저장소의 Actions에서 `Cloudflare 배포`를 수동 실행할 수 있습니다. GitHub 저장소 설정에 다음 보안 값을 먼저 등록해야 합니다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

실제 D1 `database_id`를 설정하기 전에는 배포 작업을 실행하지 마세요.

## 운영 전 확인 사항

- 관리자 모드에서 실제 단체 주소, 전화번호, 이메일 입력
- 기존 로고·사진·문서의 사용 권한 확인 후 업로드
- Cloudflare D1과 R2 리소스 ID 연결
- 실제 도메인에서 관리자 로그인, 회원가입, 파일 업로드 재검증
- 필요하면 이메일 인증과 비밀번호 찾기용 메일 발송 서비스 추가

Cloudflare 구성은 Workers Static Assets, D1 바인딩, R2 바인딩 방식으로 작성되어 있습니다.
