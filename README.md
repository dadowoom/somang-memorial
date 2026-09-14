# 소망이 있는 곳 — 소망교회 온라인 추모관

소망교회 성도의 삶과 신앙을 가족과 교회가 함께 기억하는 온라인 추모관입니다.
같은 서비스가 **일반 홈페이지**와 수양관에 두는 **키오스크(터치 화면)** 두 모습으로 쓰입니다.

|          | 주소                               |
| -------- | ---------------------------------- |
| 홈페이지 | https://somangmemorial.co.kr       |
| 키오스크 | https://somangmemorial.co.kr/kiosk |

> ⚠️ 이 저장소는 **공개**입니다. 서버 주소, 계정, 비밀번호, 데이터베이스 정보는
> 어디에도 적지 않습니다. 그런 값은 서버의 `.env` 와 관리자 개인 메모에만 둡니다.

## 무엇이 들어 있나

- 회원가입·로그인, 추모관 만들기(5단계)·수정, 사진첩, 편지, 부고장
- 가족관(비밀번호로 들어가는 가족 공간), 가족 초대(함께 관리)
- 내 부모 찾기(소망동산 안장 기록과 연결), 관리자 화면(회원·추모관·편지·문자·감사기록)
- 키오스크: 성함 검색 → 추모관 보기, 화면 자판, 90초 미사용 시 처음 화면으로

## 문서 지도 — 무엇부터 읽나

| 하려는 일                                   | 읽을 문서                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 새로 이어받아 개발한다                      | [docs/HANDOVER.md](docs/HANDOVER.md) ← **먼저**                                                     |
| 사이트가 이상하다, 죽었다                   | [docs/INCIDENT_RUNBOOK.md](docs/INCIDENT_RUNBOOK.md)                                                |
| 배포한다                                    | [docs/HANDOVER.md](docs/HANDOVER.md) 4절 → [docs/RUNTIME_DEPLOYMENT.md](docs/RUNTIME_DEPLOYMENT.md) |
| 백업·복구                                   | [docs/BACKUP.md](docs/BACKUP.md)                                                                    |
| 키오스크 PC 를 세팅한다                     | [docs/KIOSK_PC.md](docs/KIOSK_PC.md) → [docs/KIOSK_SETUP.md](docs/KIOSK_SETUP.md)                   |
| 운영 기준(무엇을 누가 바꾸나, 개시 전 목록) | [docs/PRELAUNCH_OPERATIONS.md](docs/PRELAUNCH_OPERATIONS.md)                                        |
| 회원·유가족이 글을 쓰는 흐름                | [docs/MEMBER_WRITING_FLOW.md](docs/MEMBER_WRITING_FLOW.md)                                          |

## 개발 한눈에

- React 19 + Vite(화면), Express + tRPC(서버), MySQL + drizzle(자료)
- Node 는 `.nvmrc`, pnpm 은 `package.json` 의 `packageManager` 를 따른다
- PR 전 검사 3종: `pnpm run check` · `pnpm test` · `pnpm run build` (테스트는 DB 없이 돈다)
- `main` 에 직접 커밋하지 않는다. 브랜치 → PR → CI 통과 → 병합 → 배포

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env   # DATABASE_URL, JWT_SECRET 두 값은 꼭 채운다
pnpm run dev
```

## 폴더

| 폴더       | 내용                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| `client/`  | 화면 (홈페이지·키오스크·관리자)                                                |
| `server/`  | API, 인증, 문자·메일, 예약 작업                                                |
| `shared/`  | 화면과 서버가 같이 쓰는 규칙(권한 판단, 표시 문구 등) — 순수 함수, 테스트 있음 |
| `drizzle/` | 자료 표 정의와 변경 이력(마이그레이션)                                         |
| `scripts/` | 백업, 서버 운영 도구, 키오스크 PC 설정                                         |
| `docs/`    | 위 문서들                                                                      |
