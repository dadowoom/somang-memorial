# 다른 PC에서 이어서 작업하기

맥북이든 윈도우든, 이 문서 하나만 보고 이어갈 수 있게 적는다.

> ⚠️ **이 저장소는 공개(public)다.** 서버 주소, 접속 계정, 비밀번호,
> 데이터베이스 정보는 이 문서를 포함해 저장소 안 어디에도 적지 않는다.
> 그런 값은 서버의 `.env` 와 관리자 개인 메모에만 둔다.

## 1. 시작하기

**사이트가 이상하거나 죽었으면** 이 문서가 아니라 [INCIDENT_RUNBOOK.md](INCIDENT_RUNBOOK.md) 를 먼저 본다.
저장소 전체 지도는 루트의 [README.md](../README.md) 에 있다.

키오스크 전용 PC 설정은 [KIOSK_PC.md](KIOSK_PC.md)와 [KIOSK_SETUP.md](KIOSK_SETUP.md)를 먼저 본다.
브라우저는 **Google Chrome**이며, 공식 HTTPS 주소를 연다. 화면 실행에는 Node나 로컬 개발 서버가
필요 없다. 아래 개발 환경 및 배포 절차를 키오스크 설치 절차로 실행하지 않는다.
운영 `.env`, 서버 SSH 키, DB 접속정보를 키오스크 PC에 복사하거나 이 PC에서 운영 배포하지 않는다.

```bash
git clone https://github.com/dadowoom/somang-memorial.git
cd somang-memorial
```

필요한 것:

| | 버전 | 확인 |
|---|---|---|
| Node | `.nvmrc` 참고 (24) | `node -v` |
| pnpm | `package.json` 의 `packageManager` 가 정한다 | `corepack enable` 하면 자동 |

```bash
corepack enable          # pnpm 을 package.json 에 적힌 버전으로 맞춘다
pnpm install --frozen-lockfile
cp .env.example .env     # 값을 채운다. .env 는 git 에 올라가지 않는다
pnpm run dev
```

맥에서 `pnpm install` 이 실패하면 대개 Node 버전 때문이다. `nvm use` 로 맞춘다.

## 2. 작업 규칙

- **`main` 에 직접 커밋하거나 push 하지 않는다.** 브랜치를 만들고 PR 로 올린다.
- PR 을 올리기 전에 **세 가지가 모두 통과해야 한다.**

  ```bash
  pnpm run check    # 타입 검사
  pnpm test         # 자동 시험
  pnpm run build    # 운영 빌드
  ```

- 운영 데이터베이스에 마이그레이션이나 임의 SQL 을 직접 돌리지 않는다. 표 변경은
  배포 스크립트 안의 `drizzle-kit migrate` 한 곳에서만 일어난다.
  (`db:push` 명령은 2026-09-14 에 없앴다. `generate` 를 같이 돌려 운영에 없던
  마이그레이션 파일을 새로 만들어 버릴 수 있었다.)
- 자료 삭제와 비밀번호 변경은 관리자 승인을 받고 한다.
- 셸 스크립트(`*.sh`)는 리눅스에서 돈다. 줄바꿈은 `.gitattributes` 가 LF 로
  고정하니 건드리지 않는다.

## 3. 일이 끝나면 반드시 push 한다

다른 PC에서 이어받을 수 있도록, **작업을 마칠 때마다** 브랜치를 GitHub 에 올린다.
로컬에만 있는 커밋은 그 PC를 떠나는 순간 없는 것과 같다.

```bash
git push -u origin <브랜치이름>
```

다음 PC에서 시작할 때는 **먼저 받아온다.**

```bash
git fetch origin
git status -sb          # "behind" 가 보이면 뒤처진 것이다
git pull --ff-only origin main
```

## 4. 배포

배포는 관리자가 승인한 뒤에 한다. 방식은 **릴리스 폴더 + 링크 바꾸기**다.
자세한 배경은 [RUNTIME_DEPLOYMENT.md](RUNTIME_DEPLOYMENT.md). 앱은 root 가 아니라
전용 계정 `somangapp` 으로 돈다. 그래서 **아래 순서를 빼먹으면 502 가 난다.**

1. 배포 전에 데이터베이스를 백업한다 (`scripts/backup.sh`).
2. `releases/<날짜_시각>` 에 `main` 을 새로 받는다.
3. 운영 `.env` 를 새 폴더로 복사한다.
4. 의존성은 **반드시 복사 방식**으로 설치한다.

   ```bash
   pnpm install --frozen-lockfile --config.package-import-method=copy
   pnpm run build
   ```

5. **소유자를 root 로 맞춘다.** 복사 방식으로 설치해도 `node_modules` 의 수천 개 파일이
   `joychdeploy` 소유로 만들어진다(2026-09-13·09-15 두 번 다 그랬다). 그대로 두면 앱이
   읽지 못하고, 6번 권한 도구도 "root 소유가 아니다" 라며 거부한다.
   **링크 수가 1인 파일만** 바꾼다 — 링크 수 2 이상은 다른 서비스와 같은 파일이라 절대
   손대지 않는다.

   ```bash
   find "$REL" ! -type l ! -uid 0 -links 1 -exec chown root:root {} +
   find "$REL" ! -type l ! -uid 0 | wc -l          # 0 이어야 한다
   find "$REL" ! -type l ! -uid 0 -links +1 | wc -l # 0 이어야 한다 (아니면 멈추고 사람에게)
   ```

6. 권한 준비 도구를 **점검 → 적용** 순서로 돌린다. `current` 를 바꾸기 전이다.

   ```bash
   /usr/bin/python3 -I /usr/local/bin/somang-runtime-permissions.py --release "$REL" --check
   /usr/bin/python3 -I /usr/local/bin/somang-runtime-permissions.py --release "$REL" --apply
   ```

7. `current` 링크를 새 폴더로 바꾼다.
8. 재시작은 **정식 명령**으로만 한다. `pm2 restart` 를 직접 치지 않는다.

   ```bash
   /usr/local/bin/somang-pm2-restart somang-memorial
   ```

9. 화면이 뜨는 것만 보지 말고 **데이터베이스를 읽는 요청**까지 확인한다.
   화면은 떠도 DB 연결이 끊겨 있을 수 있다.

되돌리기는 링크를 이전 릴리스 폴더로 다시 걸고 8번을 다시 하면 끝난다.
이전 릴리스는 지우지 않고 남겨 둔다.

> 서버 한 대에 여러 서비스가 함께 돌고 있다. `pm2 restart all` 처럼
> 전체에 거는 명령은 절대 쓰지 않는다. nginx 와 크론도 서버 전체에 걸린다.

### 왜 "복사 방식" 인가 — 2026-09-13 에 실제로 겪은 일

pnpm 은 기본적으로 공용 저장소(`/root/.local/share/pnpm/store`)의 파일을
**하드링크**로 끌어온다. 그 저장소에는 다른 서비스 배포 계정(`joychdeploy`)이
만든 파일이 섞여 있어, 새 릴리스의 `node_modules` 일부가 그 계정 소유로 들어온다.
그러면 `somangapp` 이 읽지 못해 앱이 뜨지 않고(`EACCES`), 권한 도구도
"root 소유가 아니다" 라며 거부한다.

이때 **`chown` 으로 고치려 들면 안 된다.** 하드링크는 원본과 같은 파일이라
소유자를 바꾸면 그 파일을 쓰는 다른 서비스 릴리스 수백 곳이 함께 바뀐다.
링크 수(`stat -c %h`)가 2 이상이면 손대지 말 것. 복사 방식으로 설치하면
처음부터 이 릴리스만의 파일이 만들어져 문제가 생기지 않는다.

## 5. 백업

- 매일 새벽 크론이 데이터베이스와 사진을 클라우드로 올린다. 30일 보관.
- 자세한 것은 [BACKUP.md](BACKUP.md).
- **로그를 아무도 안 보면 몇 달째 실패해도 모른다.** 가끔 확인한다.
- 사진 폴더가 없으면 백업이 실패하도록 되어 있다. 경로 오타나 디스크 문제를
  잡기 위해서다. 최초 설치라면 폴더를 만들어 준다.

## 6. 지금까지 된 것

- 회원가입·로그인, 추모관 만들기(5단계·예시 안내)·수정, 사진첩, 편지
- 가족관 — 화면에서 만들고 비밀번호를 바꿀 수 있다. 게시된 추모관도
  유가족이 직접 고치고, 가족을 초대해 함께 관리한다
- 내 부모 찾기, 키오스크, 관리자 화면
- 부고장 (`/memorial/<주소>/obituary`) — 검은 정통 부고장.
  길찾기·전화·일정 저장·부고 전하기 버튼이 들어 있고, 값이 없는 항목은
  줄도 버튼도 나오지 않는다.
- 개인정보처리방침·이용약관, 매일 클라우드 백업, 비밀번호 찾기(메일)
- 회원 탈퇴 (2026-09-14) — 만든 추모관은 지우지 않는다. 함께 관리하는 가족이
  있으면 가장 먼저 들어온 가족에게 주인이 넘어가고(감사기록
  `memorial.owner.transfer`), 넘길 가족이 없는 추모관이 하나라도 있으면 탈퇴를
  막고 가족 초대 또는 교회 연락을 안내한다. 규칙은 `shared/accountDeletion.ts`.
- 계정 보호 (2026-09-14) — 비밀번호를 재설정하면 그 전에 로그인해 둔 모든
  기기에서 자동으로 로그아웃된다(세션에 비밀번호 지문을 넣어 대조). 로그인
  실패는 세 겹으로 센다: 같은 곳+같은 계정 5회/10분, 계정 기준 15회/30분,
  접속지 기준 30회/15분. 이 기능을 처음 배포한 직후에는 기존 로그인이 한 번
  풀리므로 모두 다시 로그인해야 한다.
- **도메인 + HTTPS** — `https://somangmemorial.co.kr` (www 포함, http 는 자동 이동).
  인증서는 자동 갱신. 문자·메일에 넣는 주소는 `server/_core/siteUrl.ts` 한 곳에서 만든다.
  옛 IP 직접 접속(`:3050`)은 방화벽에서 닫았다. 앱은 nginx 뒤 127.0.0.1 로만 열린다.

## 7. 남은 것

| 할 일 | 메모 |
|---|---|
| 메일 발송 설정 | `.env` 의 `SMTP_*` 가 비어 있으면 재설정 메일이 나가지 않는다 |
| 키오스크 문의 메일 | `.env` 의 `INQUIRY_NOTIFY_EMAIL` 이 업체 메일 주소. 비어 있으면 메일은 안 가고 관리자 화면 → 운영 → 키오스크 문의에만 남는다 |
| 조의금 계좌 | 부고장에 넣으려면 자료 표에 칸을 추가해야 한다 |
| 소망동산 사진 용량 | 4장 합 1.5MB. 800px 인데 압축이 약하다. 휴대폰 데이터로 무겁다 |
| 사진 원본 정리 | `scripts/strip-existing-photo-metadata.ts` (위치정보 제거) |

바깥 서버 `rc.somang.net` 은 HTTPS 를 지원하지 않는다. 거기서 **사진·스크립트를
불러오면 브라우저가 막는다.** 링크로 거는 것만 된다.

## 8. 새 세션을 시작할 때

1. `git fetch origin` 후 뒤처졌으면 받아온다.
2. `gh pr list` 로 열려 있는 PR 을 본다.
3. 운영이 무엇을 돌리고 있는지 확인한다 (릴리스 폴더의 커밋).
   **문서에 적힌 배포 상태를 믿지 말고 서버에서 직접 본다.**
4. `pnpm install --frozen-lockfile` 을 먼저 돌린다. 오래된 `node_modules`
   때문에 나는 오류를 코드 문제로 오해하기 쉽다.
