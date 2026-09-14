# 장애 대응 순서 (INCIDENT RUNBOOK)

마지막 갱신: 2026-09-14

사이트가 이상할 때 **이 문서 순서대로** 본다. 급할수록 순서를 건너뛰지 않는다.
서버 접속은 [HANDOVER.md](HANDOVER.md) 의 규칙(열쇠가 있는 PC 에서만, 한 번에 한 곳에서만)을 따른다.

> ⚠️ 공개 저장소다. 서버 주소·계정·비밀번호는 적지 않는다.
> 아래 명령은 전부 **서버 안에서** root 로 실행하는 것이다.

## 0. 먼저 30초 — 어디가 문제인지 가르기

| 증상                             | 다른 휴대폰(다른 통신망)에서 `https://somangmemorial.co.kr` 이 열리나? | 판단                                                                    |
| -------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 키오스크만 안 됨                 | 열린다                                                                 | **키오스크 PC 문제** → [KIOSK_SETUP.md](KIOSK_SETUP.md) "문제가 생기면" |
| 어디서도 안 열림                 | 안 열린다                                                              | **서버 문제** → 1절부터                                                 |
| 열리는데 자료가 없음 / 오류 문구 | 열린다                                                                 | **앱 또는 DB 문제** → 2절                                               |
| 로그인이 갑자기 풀림             | —                                                                      | 비밀번호 재설정·배포 직후면 정상(다시 로그인). 계속되면 2절             |

## 1. 서버가 살아 있나 (읽기만 하는 확인)

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://somangmemorial.co.kr/healthz   # 200 이면 앱은 떠 있다
curl -s https://somangmemorial.co.kr/readyz                                     # {"status":"ready","database":"ok"} 가 정상
pm2 describe somang-memorial | grep -E 'status|uptime|restarts'
systemctl status nginx --no-pager | head -5
df -h /
```

| 결과                                                | 뜻                                            | 다음 |
| --------------------------------------------------- | --------------------------------------------- | ---- |
| `healthz` 200, `readyz` ready                       | 정상. 화면 문제면 브라우저 캐시·키오스크 확인 | 끝   |
| `healthz` 200, `readyz` `not_ready`                 | 앱은 떠 있는데 **DB 연결이 끊김**             | 3절  |
| `healthz` 502/타임아웃, pm2 `online`                | nginx ↔ 앱 사이 문제                         | 4절  |
| pm2 `errored` / `stopped` / restarts 가 계속 늘어남 | **앱이 죽는 중**                              | 2절  |
| nginx 가 죽어 있음                                  | 서버 전체 문제(다른 서비스도 영향)            | 5절  |
| 디스크 90% 이상                                     | 꽉 차면 DB·로그·백업이 멈춘다                 | 6절  |

## 2. 앱이 죽었거나 계속 재시작될 때

```bash
tail -50 /root/.pm2/logs/somang-memorial-error.log
tail -50 /root/.pm2/logs/somang-memorial-out.log
```

- `[fatal] 서버 기동 실패 … DATABASE_URL, JWT_SECRET` → `.env` 가 비었거나 빠졌다. 릴리스 폴더의 `.env` 를 이전 릴리스에서 복사한다(권한 600).
- `EACCES` → 릴리스 파일 소유권 문제. [RUNTIME_DEPLOYMENT.md](RUNTIME_DEPLOYMENT.md) 의 권한 준비 도구를 `--check` → `--apply` 로 돌린다.
- 방금 배포한 뒤부터 그렇다 → **되돌린다** (7절). 원인 찾기는 그 다음이다.
- 그 외 → 로그 문구를 그대로 들고 개발 담당에게 넘긴다. **`pm2 restart all` 은 절대 치지 않는다** (다른 서비스까지 재시작된다).

재시작은 정식 명령으로만:

```bash
/usr/local/bin/somang-pm2-restart somang-memorial
```

## 3. DB 연결이 끊겼을 때 (`readyz` 가 not_ready)

- 같은 서버의 다른 서비스도 DB 를 못 쓰는지 본다. 같이 안 되면 DB 서버(호스팅사 콘솔) 문제다.
- 앱만 안 되면 `.env` 의 `DATABASE_URL` 이 바뀌었는지(배포 때 옛 `.env` 를 복사했는지) 본다.
- **DB 를 직접 고치거나 표를 바꾸지 않는다.** 마이그레이션은 배포 스크립트만 돌린다.

## 4. 502 / nginx 는 살아 있는데 앱에 못 닿을 때

```bash
nginx -t
tail -30 /var/log/nginx/error.log
ss -ltnp | grep 3050        # 앱이 127.0.0.1:3050 에서 듣고 있어야 한다
```

- 앱이 안 듣고 있으면 2절.
- nginx 설정을 고쳤다면 `nginx -t` 통과 후 **`systemctl restart nginx`** (reload 아님). 2026-08-14 장애 교훈.

## 5. 서버 전체가 안 될 때

- 호스팅사 콘솔에서 서버 상태(전원·네트워크)를 본다. 필요하면 콘솔의 VNC 로 들어간다.
- 재부팅은 다른 서비스도 전부 내려가는 일이다. 소망만의 문제가 아닐 때만, 관리자 승인 뒤에 한다.

## 6. 디스크가 찼을 때

```bash
df -h / /data
du -sh /var/www/somang-memorial/releases/* /root/somang-release-archive
```

- 릴리스 하나가 약 600MB 다. `/root/somang-release-archive` 의 옛 릴리스(현재·되돌리기용 제외)를 지운다. 2026-09-14 에 141개를 지워 84% → 63% 가 됐다.
- pm2 로그(`/root/.pm2/logs/`)가 크면 비운다. 사진 폴더(`/var/www/somang-memorial/uploads`)는 **절대 지우지 않는다.**

## 7. 배포를 되돌리기

배포 기록(`/root/somang-deploy-run-*.log` 또는 `/root/somang-deploy.log`)의 마지막에 **"되돌리기:"** 한 줄이 그대로 적혀 있다. 그 줄을 복사해 실행하면 이전 릴리스로 돌아간다. 형태는 이렇다.

```bash
/usr/local/bin/somang-runtime-permissions.py --release <이전릴리스> --apply \
 && ln -sfn <이전릴리스> /var/www/somang-memorial/current.tmp \
 && mv -Tf /var/www/somang-memorial/current.tmp /var/www/somang-memorial/current \
 && /usr/local/bin/somang-pm2-restart somang-memorial
```

되돌린 뒤 1절 확인을 다시 한다. 이전 릴리스 폴더는 지우지 않고 남겨 두므로 언제든 가능하다.
DB 는 되돌리지 않는다(표 변경이 있었던 배포면 개발 담당과 상의).

## 8. 백업이 안 돌았다는 알림이 왔을 때

```bash
tail -30 /var/log/somang-memorial-backup.log
```

- 마지막에 `오늘(날짜) 백업이 정상적으로 끝났습니다.` 가 있어야 한다.
- 원격 저장소 접근 실패면 rclone 설정·네트워크, 폴더 없음이면 사진 폴더 마운트를 본다. 자세한 것은 [BACKUP.md](BACKUP.md).
- 복구는 [BACKUP.md](BACKUP.md) 6절. **복구는 기존 자료를 덮어쓰므로 관리자 확인 후에만.**

## 9. 어디를 보나 — 로그·자동 감시 한눈에

| 무엇            | 어디                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 앱 오류         | `/root/.pm2/logs/somang-memorial-error.log`                                                                                       |
| 앱 요청 기록    | `/root/.pm2/logs/somang-memorial-out.log` (본문·비밀번호는 안 남긴다)                                                             |
| nginx           | `/var/log/nginx/access.log`, `/var/log/nginx/error.log`                                                                           |
| 배포            | `/root/somang-deploy.log`, `/root/somang-deploy-run-*.log`                                                                        |
| 백업            | `/var/log/somang-memorial-backup.log` (매일 04:37)                                                                                |
| 서버 자동 감시  | `/var/log/dadowoom-watch.log` — 07:20·19:20 에 사이트 응답·백업 성공·디스크 85%·인증서·재시작 횟수를 보고 **텔레그램**으로 알린다 |
| 관리자 감사기록 | 사이트 관리자 화면 → 회원 → 감사기록 (누가 언제 무엇을 바꿨나)                                                                    |

## 10. 계정이 잠겼다·관리자 비밀번호를 잊었다

- 로그인 실패가 잦으면 잠시 막힌다(같은 곳 5회/10분, 계정 15회/30분). 기다리면 풀린다.
- 회원은 "비밀번호 찾기"(메일)로 재설정한다. 재설정하면 다른 기기의 로그인은 모두 풀린다(정상).
- **관리자 계정**(아이디 `admin`)은 서버 터미널에서 `server/scripts/bootstrapAdmin.ts` 로 처음 한 번 만든다(이미 있으면 다시 만들지 못한다). 비밀번호를 잊었으면 개발 담당과 상의한다. 화면에서 다른 회원을 관리자로 올리는 것은 관리자 화면 → 회원 → 권한 변경.

## 11. 절대 하지 않는 것

- `pm2 restart all`, `pm2 delete`, 서버 재부팅을 소망 문제 때문에 단독으로 하지 않는다.
- 운영 DB 에 `db:push`, 임의 SQL, 표 삭제를 하지 않는다.
- 사진 폴더와 백업 폴더를 지우지 않는다.
- 비밀번호·키·`.env` 내용을 채팅·이슈·커밋에 적지 않는다.
- 두 사람(두 컴퓨터)이 동시에 서버를 만지지 않는다.
