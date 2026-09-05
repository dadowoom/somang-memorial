# 다른 PC에서 이어서 작업하기

맥북이든 윈도우든, 이 문서 하나만 보고 이어갈 수 있게 적는다.

> ⚠️ **이 저장소는 공개(public)다.** 서버 주소, 접속 계정, 비밀번호,
> 데이터베이스 정보는 이 문서를 포함해 저장소 안 어디에도 적지 않는다.
> 그런 값은 서버의 `.env` 와 관리자 개인 메모에만 둔다.

## 1. 시작하기

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

- 운영 데이터베이스에 `db:push`, 마이그레이션, 임의 SQL 을 직접 돌리지 않는다.
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

1. 배포 전에 데이터베이스를 백업한다 (`scripts/backup.sh`).
2. `releases/<날짜_시각>` 에 `main` 을 새로 받아 `pnpm install` + `pnpm run build`.
3. 운영 `.env` 를 새 폴더로 복사한다.
4. `current` 링크를 새 폴더로 바꾼다.
5. pm2 프로세스를 **이름을 찍어서** 다시 시작한다.

> 서버 한 대에 여러 서비스가 함께 돌고 있다. `pm2 restart all` 처럼
> 전체에 거는 명령은 절대 쓰지 않는다. nginx 와 크론도 서버 전체에 걸린다.

되돌리기는 링크를 이전 릴리스 폴더로 다시 걸고 pm2 를 재시작하면 끝난다.
이전 릴리스는 지우지 않고 남겨 둔다.

배포 뒤에는 화면이 뜨는 것만 보지 말고 **데이터베이스를 읽는 요청**까지 확인한다.
화면은 떠도 DB 연결이 끊겨 있을 수 있다.

## 5. 백업

- 매일 새벽 크론이 데이터베이스와 사진을 클라우드로 올린다. 30일 보관.
- 자세한 것은 [BACKUP.md](BACKUP.md).
- **로그를 아무도 안 보면 몇 달째 실패해도 모른다.** 가끔 확인한다.
- 사진 폴더가 없으면 백업이 실패하도록 되어 있다. 경로 오타나 디스크 문제를
  잡기 위해서다. 최초 설치라면 폴더를 만들어 준다.

## 6. 지금까지 된 것

- 회원가입·로그인, 추모관 만들기(5단계)·수정, 사진첩, 편지, 가족관
- 내 부모 찾기, 키오스크, 관리자 화면
- 부고장 (`/memorial/<주소>/obituary`) — 검은 정통 부고장.
  길찾기·전화·일정 저장·부고 전하기 버튼이 들어 있고, 값이 없는 항목은
  줄도 버튼도 나오지 않는다.
- 개인정보처리방침·이용약관, 매일 클라우드 백업, 비밀번호 찾기(메일)

## 7. 남은 것

| 할 일 | 메모 |
|---|---|
| 도메인 + HTTPS | 지금은 IP 주소로 접속한다. 부고장을 문자로 받는 사람이 낯설어한다 |
| 메일 발송 설정 | `.env` 의 `SMTP_*` 가 비어 있으면 재설정 메일이 나가지 않는다 |
| 조의금 계좌 | 부고장에 넣으려면 자료 표에 칸을 추가해야 한다 |
| 사진 원본 정리 | `scripts/strip-existing-photo-metadata.ts` (위치정보 제거) |

HTTPS 로 바꿀 때는 `TRUST_PROXY=true` 로 두고, 화면 안에 남은 `http://` 주소가
없는지 확인한다. 섞여 있으면 브라우저가 사진을 막는다.

## 8. 새 세션을 시작할 때

1. `git fetch origin` 후 뒤처졌으면 받아온다.
2. `gh pr list` 로 열려 있는 PR 을 본다.
3. 운영이 무엇을 돌리고 있는지 확인한다 (릴리스 폴더의 커밋).
   **문서에 적힌 배포 상태를 믿지 말고 서버에서 직접 본다.**
4. `pnpm install --frozen-lockfile` 을 먼저 돌린다. 오래된 `node_modules`
   때문에 나는 오류를 코드 문제로 오해하기 쉽다.
