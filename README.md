# 소망교회 온라인 추모관

React 19, Vite, tRPC, Express, MySQL로 만든 온라인 추모관 프로젝트입니다.

## 새 PC에서 시작하기

Windows와 macOS 모두 Node.js 22와 pnpm 10.4.1을 사용합니다.

```bash
git clone https://github.com/dadowoom/somang-memorial.git
cd somang-memorial
git switch main
git pull --ff-only origin main
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
```

`.env.example`을 참고해 각 PC에 `.env`를 따로 준비합니다. 비밀번호, API 키,
데이터베이스 주소 같은 비밀값은 공개 저장소나 채팅에 올리지 않습니다.

## 작업 시작

```bash
git switch main
git pull --ff-only origin main
git switch -c codex/작업-이름
```

기존 코드를 먼저 살펴본 뒤 필요한 파일만 수정합니다. 다른 PC에서 진행 중인
브랜치가 있다면 새 브랜치를 만들지 말고 그 브랜치를 먼저 받아 이어갑니다.

## 작업 종료

```bash
pnpm check
pnpm test
pnpm build
git status
git push -u origin 현재-브랜치
```

수정한 파일만 골라 커밋하고 GitHub에 브랜치를 올린 뒤 PR을 만듭니다. PR에는
변경 내용, 검사 결과, DB 영향, 배포 여부, 남은 작업을 적습니다. 관리자 승인 후
`main`에 병합하며, 배포는 관리자가 명시적으로 요청할 때만 진행합니다.

## 꼭 지킬 안전 규칙

- `main`에 직접 커밋하지 않습니다.
- 저장소 전체에 `prettier --write`나 `pnpm format`을 실행하지 않습니다.
- 운영 DB에서 `pnpm db:push`를 실행하지 않습니다.
- 삭제, 재시작, 설정 변경, DB 변경은 먼저 설명하고 승인을 받습니다.
- 병합 후에는 자동검사뿐 아니라 실제 브라우저 화면도 확인합니다.
- `.codex_tmp/`, 로컬 보조 파일, `.env`는 커밋하지 않습니다.

Codex가 따라야 할 상세 규칙은 [AGENTS.md](./AGENTS.md), 최신 인계 상태는
[docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md)에 있습니다.
