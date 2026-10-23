# 소망 작업장 앱 계약

이 문서는 회사 서버의 **가짜 자료 전용 미리보기** 앱에만 적용한다. 운영 진입점은 `server/_core/index.ts`, 작업장 진입점은 `dist/previewFake.js`다. 작업장 주소는 `https://somang-preview.dadowoomtest.co.kr`, 메일함 주소는 `https://somang-preview-mail.dadowoomtest.co.kr`이다. 서버 설치와 외부 공개는 이 저장소 작업 범위가 아니다.

## 환경 설정

서버 담당자가 비밀값을 서버에서 새로 발급한다. 이 저장소나 로그에 실제 값을 적지 않는다. `SOMANG_FAKE_PASSWORD_SECRET`은 코드가 사용하지 않는다.

| 이름                                                                                                                   | 작업장 값                                           | 비밀?  | 누가 넣나 | 비고                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------ | --------- | -------------------------------------------------------------------------------------------------------- |
| `SOMANG_FAKE`                                                                                                          | `1`                                                 | 아니오 | 서버 담당 | 없으면 시작 거부                                                                                         |
| `NODE_ENV`, `HOST`, `PORT`                                                                                             | `production`, `0.0.0.0`, `3000`                     | 아니오 | 서버 담당 | 정확히 일치                                                                                              |
| `DATABASE_URL`                                                                                                         | `mysql://<user>:<password>@db:3306/somang_workshop` | 예     | 서버 담당 | 호스트·포트·DB 이름과 연결 후 DB 이름 재확인                                                             |
| `JWT_SECRET`                                                                                                           | 새 무작위 32바이트 이상                             | 예     | 서버 담당 | 로그인 세션 비밀                                                                                         |
| `PUBLIC_SITE_URL`                                                                                                      | `https://somang-preview.dadowoomtest.co.kr`         | 아니오 | 서버 담당 | 필수                                                                                                     |
| `PUBLIC_BASE_URL`, `APP_ORIGIN`                                                                                        | 같은 작업장 주소                                    | 아니오 | 서버 담당 | 넣는다면 정확히 같아야 함                                                                                |
| `UPLOAD_DIR`, `STATE_DIR`                                                                                              | `/data/uploads`, `/data/state`                      | 아니오 | 서버 담당 | 영구 저장 폴더                                                                                           |
| `SMTP_HOST`, `SMTP_PORT`                                                                                               | `mail`, `1025`                                      | 아니오 | 서버 담당 | 작업장 메일함으로만 보냄                                                                                 |
| `SMTP_FROM`                                                                                                            | 예: `preview@preview.invalid`                       | 아니오 | 서버 담당 | 외부 실주소 사용 금지                                                                                    |
| `SMTP_SECURE`, `SMTP_REQUIRE_TLS`                                                                                      | `false`, `false`                                    | 아니오 | 서버 담당 | 인증·TLS 없음                                                                                            |
| `REMINDER_SCHEDULER_ENABLED`, `LETTER_NOTICE_ENABLED`                                                                  | `false`, `false`                                    | 아니오 | 서버 담당 | 자동 알림 꺼짐                                                                                           |
| `SOMANG_FAKE_ADMIN_PASSWORD`, `SOMANG_FAKE_USER_PASSWORD`, `SOMANG_FAKE_PRIVATE_PASSWORD`, `SOMANG_FAKE_ROOM_PASSWORD` | 선택 사항                                           | 예     | 서버 담당 | 없으면 첫 시드 때 무작위 발급하여 `/data/state/fake-passwords.json` 0600 파일에 저장. 로그에는 쓰지 않음 |
| `TRUST_PROXY`, `COOKIE_SECURE`, `HEALTH_PATH`                                                                          | `1`, `1`, `/api/health`                             | 아니오 | 서버 담당 | 프록시·쿠키·건강 확인                                                                                    |
| `SOMANG_FAKE_PASSWORD_SECRET`                                                                                          | 안 씀                                               | —      | —         | 설정하지 않음                                                                                            |

`ALIGO_*`, `INQUIRY_NOTIFY_EMAIL`, `S3_*`, `AWS_*`, `BUILT_IN_FORGE_*`, `OAUTH_*`, `OWNER_OPEN_ID`, `VITE_*`, `OPENAI_*`, `ANTHROPIC_*`, `SMTP_USER`/`SMTP_PASS`/`SMTP_PASSWORD`/`SMTP_USERNAME`, `DOTENV_*`, `NODE_OPTIONS`, `PREVIEW_PEER*`, 그 밖의 `REMINDER*`·`LETTER_NOTICE*` 이름은 값이 비어 있어도 거부한다. 허용 목록 밖의 다른 이름은 **이름만** 로그에 남기고 버린다. Node 실행에 필요한 `PATH`, `HOME`, `LANG`, `TZ`, 임시 폴더 이름만 유지한다.

## 시작 판단 순서

1. 원본 환경 설정과 리셋 표시를 먼저 검사하고, 허용 목록으로 환경을 다시 만든다. 이때 DB 연결이나 서버 코드 import가 없다.
2. `db:3306/somang_workshop`에 연결해 `SELECT DATABASE()` 결과가 `somang_workshop`인지 확인한다.
3. DB가 완전히 비었으면 기존 `drizzle/*.sql`과 journal로 표를 만들고, `preview_meta`를 `started`로 표시한 다음 #203 가짜 시드를 한 번 실행한다. 끝나면 `seeded`로 표시한다.
4. 이미 `seeded`이면 새 마이그레이션만 적용하고 시드는 건너뛴다. 표가 있는데 표식이 없거나 `started`면 **쓰기 전에 중단**한다. 최초 시드 중 오류가 난 상태는 담당자가 조사하고 복구하거나 명시적 리셋을 택한다.
5. 준비가 끝난 다음에만 웹 서버를 띄운다. `/api/health`는 준비 전 503 또는 연결 불가, 준비 후 200이다. 운영 `/healthz`는 그대로다.

과거의 `0004`, `0005`, `0009`, `0025`, `0026` 마이그레이션은 기존 예시 추모관에 사진·편지·가족관을 붙인다. **완전히 빈 DB에는 그 추모관이 없으므로 관련 견본 행이 0개**이며, 시드의 `countNonFakeRows()` 예외를 넓힐 필요가 없다. `0006`과 `0011`의 예시 추모관 생성은 이미 폐기되어 `SELECT 1`만 남아 있다. `0025`에는 오래된 예시 사진을 지우는 조건부 SQL도 있다. 빈 DB에는 대상이 없어 실제 삭제 행은 0개다. 과거 예시에는 이름과 인물 사진 링크가 들어 있으므로 실제 사람의 것이 아님을 사진별로 증명할 수 없다. 따라서 작업장에는 예시 추모관이 들어 있는 기존 DB를 반입하지 말아야 한다.

시드 사진은 작업장에서 정해진 파일명으로 저장한다. 실패 후 자동 재시드는 없고, 폴더를 지우지 않는다. DB 시드와 파일 쓰기는 하나의 원자적 작업이 아니므로, 첫 시드 실패 때 `started` 표식이 남으면 서버에서 백업·조사 후 리셋 여부를 결정한다.

## 리셋과 서버 담당 확인

리셋은 **작업장 DB의 모든 표를 삭제**한다. 자료를 보존하거나 복구할 필요가 있는지 확인하고 사본을 만든 다음, 서버 담당자가 `--site-reset --confirm-site-reset` 두 표시를 함께 준 경우에만 실행한다. 한 표시만 있으면 시작을 거부한다. `/data/uploads`와 `/data/state`는 지우지 않는다. 명령 예시는 `pnpm run preview:fake:reset`이다. 운영 DB에는 절대 사용하지 않는다.

서버 담당자는 DB 이름 `somang_workshop`, 앱 사용자 uid/gid `10001`, `/data/uploads`와 `/data/state` 영구 마운트 및 쓰기 권한, 메일 서비스 `mail:1025`, 건강 확인 `/api/health`를 맞춘다. `SOMANG_FAKE=1`일 때 일반 메일은 이 메일 서비스로만 보내고, 알림톡·인증번호는 가짜 받는이 메일로 남긴다. 외부 알리고 요청은 없다. 메일함 UI 공개와 네트워크 차단은 서버 담당자가 별도로 확인한다.
