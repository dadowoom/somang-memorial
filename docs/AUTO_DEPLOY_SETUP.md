# 자동 배포 준비 안내 (초안)

이 문서는 **자동 배포를 켜기 전에 사람이 해야 할 일**만 적습니다.
이 파일들을 main 에 합쳐도, 아래 준비(특히 깃허브 금고)가 끝나기 전에는 **아무 일도 일어나지 않습니다.**

> 공개 저장소입니다. 서버 주소·계정 비밀번호·열쇠는 여기에 적지 않습니다. 금고(Secrets)·변수(Variables)의 **이름**만 적습니다.

## 1. 무엇이 자동으로 되는가

| 언제 | 무슨 일이 일어나나 |
| --- | --- |
| `main` 에 병합될 때, 한국시간 **09:00~18:00** | 검사(타입·시험·빌드·배포 단추 시험) 후 **바로 배포**합니다. |
| `main` 에 병합될 때, 그 밖의 시간 | **배포하지 않습니다.** 다음 날 09:00 예약이 내보냅니다. |
| 매일 09:00 KST (예약) | 지금 올라가 있는 버전과 같으면 **바로 끝냅니다**(검사·빌드도 안 함). 다르면 검사 후 배포합니다. |
| 깃허브에서 단추를 누를 때 | 시간 제한 없이 예약과 같은 일을 합니다(같은 버전이면 바로 끝). |

- 시각은 **깃허브가 이 일을 시작한 때** 기준입니다. 17:59 에 병합하면 검사 뒤 18시 몇 분에 나갈 수 있습니다.
- 깃허브 예약은 UTC 기준이라 `0 0 * * *` 이 09:00 KST 입니다. 깃허브 사정으로 몇 분~십여 분 늦을 수 있습니다. 주말에도 돕니다.

## 2. 어떻게 배포하나 — 지금 손 배포와 같은 순서

깃허브는 서버에 **"이 커밋을 배포해 줘" 한 줄**만 보냅니다. 파일을 보내지 않습니다.
서버의 **자동 배포 단추**(`/usr/local/bin/somang-auto-deploy`, root 소유)가 나머지를 합니다.
순서는 [HANDOVER.md 4절](HANDOVER.md)·[RUNTIME_DEPLOYMENT.md](RUNTIME_DEPLOYMENT.md)의 정식 배포와 같습니다.

1. 지금 운영 버전을 읽고, 새 버전과 같으면 끝.
2. 깃허브에서 그 커밋을 `releases/<날짜_시각>` 에 새로 받습니다.
3. **서버에서도 한 번 더** 확인: 그 커밋이 main 에 있는지, 지금 운영보다 새 버전인지, DB 구조·부품 변경이 없는지.
4. 운영 `.env` 를 새 폴더로 복사합니다.
5. 의존성은 **반드시 복사 방식**으로 설치하고 빌드합니다(`--config.package-import-method=copy`).
6. root 가 아닌 파일은 **링크 수가 1 인 것만** root 로 바꿉니다. 링크 수 2 이상(다른 서비스와 같은 파일)은 **절대 손대지 않고**, 남아 있으면 멈춥니다.
7. 권한 준비 도구를 **점검 → 적용** 합니다.
8. **배포 전 백업**: DB·사진을 매일 새벽 백업과 같은 암호화 보관소로 보냅니다(보관 30일, 기존 규칙). 실패하면 멈춥니다.
9. `current` 를 새 폴더로 바꾸고, **정식 재시작 명령**(`somang-pm2-restart somang-memorial`)으로 소망만 다시 켭니다.
10. 건강 확인: `/healthz`, `/readyz`(DB 연결), **DB 를 실제로 읽는 요청**(`memorial.list`)까지 봅니다.
11. 다른 사이트(응답 번호만)와 다른 PM2 앱(개수·지문만)이 배포 전과 같은지 봅니다.
12. 성공하면 옛 릴리스 보관 도구를 돌립니다(최근 5개·현재·되돌리기용은 제자리에 남김).

**2~11 중 어디서든 실패하면:** `current` 를 바꾸기 전이면 운영은 그대로이고 새 폴더만 치웁니다.
바꾼 뒤라면 **직전 릴리스로 되돌리고 다시 켠 뒤 건강 확인**을 합니다. 그 버전에는 "실패" 표시를 남겨
다음 날 예약이 같은 버전을 되풀이하지 않게 합니다(고친 새 커밋이 오면 다시 시도).

## 3. 안전장치

- **금고(Secrets)가 비어 있으면 아무것도 하지 않고 조용히 끝납니다.** 서버에 접속도 하지 않습니다.
- **자동으로 내보내지 않는 경우**(검사·빌드도 하지 않고 경고만 남김):
  - 서버의 지금 운영 버전을 모를 때.
  - 운영 버전이 main 기록에 없을 때(다른 가지를 손으로 올린 경우 — main 으로 덮으면 그 기능이 사라지므로).
  - DB 구조(`drizzle/`)나 서버 부품(`pnpm-lock.yaml`·`patches/`)이 바뀌었을 때. 자동 배포는 DB 변경(`drizzle-kit migrate`)을 하지 않습니다. 이런 버전은 지금처럼 손으로 배포합니다.
  - 전에 실패해서 되돌린 바로 그 버전일 때.
- 배포 전용 계정 `somangdeploy` 의 열쇠는 `restrict` 와 **"자동 배포 단추만"** 으로 묶습니다. 이 열쇠로는 터미널을 열 수도, 다른 명령을 칠 수도 없습니다.
- sudo 는 **단추 하나**(`somang-auto-deploy status` / `deploy <커밋>`)만 허용합니다. 단추의 경로·앱 이름·포트·도구 위치는 모두 파일 안에 고정이라, 배포 계정이 바꿀 수 있는 값은 **커밋 번호 하나**뿐입니다.
  - 그래서 열쇠가 새더라도 할 수 있는 일은 "main 에 이미 있는, 지금보다 새, DB·부품 변경이 없는 버전을 배포" 뿐입니다.
- Nginx·크론·다른 PM2 앱은 **바꾸지 않습니다.** `pm2 restart all`·`pm2 save` 도 하지 않습니다.
- 깃허브 기록은 공개입니다. 그래서 화면에는 **요약만** 남기고(주소·DB 이름 없음), 자세한 기록은 서버의 `/root/somang-auto-deploy.log` 에 남깁니다.

## 4. 사장님이 확인할 값

문서로 확인이 끝난 값(경로 `/var/www/somang-memorial`, 앱 `somang-memorial`, 포트 3050, 재시작·권한·보관 도구 위치, `/healthz`·`/readyz`)은
단추 안에 고정했습니다. 아래는 **문서로 확인이 안 돼서** 사장님이 서버에서 보고 넣어야 하는 값입니다.

| 값 | 어디서 보나 | 어디에 넣나 |
| --- | --- | --- |
| 배포 전 백업 보낼 곳 (`RCLONE_REMOTE`) | 서버 `/etc/cron.d/somang-memorial` (5번) | 서버 `/etc/somang-auto-deploy.conf` (root 전용 600) |
| 지금 운영 버전 (커밋 40자) | 서버 current 릴리스의 git 기록 (3번) | 단추가 자동으로 읽음. git 이 없으면 3-2번 |
| 서버 주소 | 사장님이 아는 값 | 금고 `SOMANG_SSH_HOST` |
| SSH 포트 (22 가 아닐 때만) | 사장님이 아는 값 | 변수 `SOMANG_SSH_PORT` (없으면 22) |
| 공개 주소 | 기본 `https://somangmemorial.co.kr` | 변수 `SOMANG_PUBLIC_URL` (바꿀 때만) |
| root 로 `git`·`pnpm`·`flock`·`rclone` 이 되는지, 서버가 깃허브에서 코드를 받을 수 있는지 | 2번 | — |
| SSH 설정이 새 계정 접속을 막지 않는지(AllowUsers 등) | 20번 접속 시험 | 막히면 클로드에게 |

## 5. 준비 — 한 번만 하면 됩니다 (한 줄씩, 위에서부터)

> `[내 PC]` 는 Git Bash 창, `[서버]` 는 관리자(root)로 서버에서 칩니다.
> 결과가 설명과 다르면 **거기서 멈추고** 클로드에게 보여 주세요.

0. **켜기 전에** 클로드에게 서버의 기존 손 배포 스크립트(`/root/somang-deploy.sh`)와 이 단추를 한 줄씩 대조해 달라고 부탁합니다(그 파일은 저장소에 없어서 빠진 단계가 없는지 확인이 필요합니다).
1. 이 PR 을 병합합니다 → 깃허브 Actions 에서 "Deploy Production" 이 **초록불**이고 "금고가 아직 비어 있어 아무것도 하지 않고 끝냅니다" 가 보이는지 봅니다.
2. [서버] 도구 확인 — `ls -l /usr/local/bin/somang-pm2-restart /usr/local/bin/somang-runtime-permissions.py /usr/local/bin/somang-release-archive.py && command -v git pnpm flock rclone mysqldump && /usr/bin/node --version && git ls-remote https://github.com/dadowoom/somang-memorial.git HEAD` → 모두 나오고, node 는 v20.6 이상이어야 합니다.
3. [서버] 지금 운영 버전 — `git -C "$(readlink -f /var/www/somang-memorial/current)" rev-parse HEAD` → 40자가 나오면 클로드에게 보여 줍니다(main 기록에 있는지 확인).
   - 3-2. 오류가 나면(릴리스에 git 기록이 없음) 클로드가 확인해 준 40자로 — `printf '%s\n' <40자> > "$(readlink -f /var/www/somang-memorial/current)/.deployed-commit"`
4. [서버] `.env` 에 DB 주소가 있는지(값은 화면에 안 나옴) — `grep -c '^DATABASE_URL=' "$(readlink -f /var/www/somang-memorial/current)/.env"` → `1`
5. [서버] 백업 보낼 곳 확인 — `grep -o 'RCLONE_REMOTE=[^ ]*' /etc/cron.d/somang-memorial` → `RCLONE_REMOTE=ncpcrypt-services:...` 같은 한 줄(비밀값 아님).
6. [서버] 단추 설정 파일 — `grep -o 'RCLONE_REMOTE=[^ ]*' /etc/cron.d/somang-memorial | head -1 > /etc/somang-auto-deploy.conf && chmod 600 /etc/somang-auto-deploy.conf && cat /etc/somang-auto-deploy.conf` → 5번과 같은 한 줄.
7. [서버] 배포 전용 계정 — `getent passwd somangdeploy || useradd --system --create-home --home-dir /var/lib/somangdeploy --shell /bin/sh somangdeploy` → 이 계정은 sudo 단추 말고는 아무 권한이 없습니다(앱 계정 `somangapp` 과 다릅니다).
8. [서버] 단추 설치 — `curl -fsSL https://raw.githubusercontent.com/dadowoom/somang-memorial/main/scripts/deploy-production-remote.sh -o /tmp/somang-auto-deploy && install -o root -g root -m 0755 /tmp/somang-auto-deploy /usr/local/bin/somang-auto-deploy && rm /tmp/somang-auto-deploy && sha256sum /usr/local/bin/somang-auto-deploy` → 나온 지문을 클로드에게 보여 주면 저장소 파일과 같은지 확인해 드립니다.
9. [서버] 단추 시험(읽기만) — `/usr/local/bin/somang-auto-deploy status` → 3번과 같은 40자.
10. [서버] 단추 하나만 허용 — `echo 'somangdeploy ALL=(root) NOPASSWD: /usr/local/bin/somang-auto-deploy status, /usr/local/bin/somang-auto-deploy deploy *' > /tmp/somang-deploy && visudo -cf /tmp/somang-deploy && install -m 440 -o root -g root /tmp/somang-deploy /etc/sudoers.d/somang-deploy && rm /tmp/somang-deploy && visudo -c` → **먼저 문법을 검사한 뒤에** 넣습니다. `deploy` 뒤의 값은 단추가 "커밋 40자" 인지 다시 검사합니다.
11. [내 PC] 열쇠 만들기 — `ssh-keygen -t ed25519 -f ~/somang-deploy-key -N "" -C somang-github-deploy`
12. [내 PC] **금고 1: 개인 열쇠**(화면에 안 보이게 바로) — `gh secret set SOMANG_SSH_PRIVATE_KEY -R dadowoom/somang-memorial < ~/somang-deploy-key`
13. [내 PC] 공개 열쇠 보내기 — `ssh dadowoom "cat > /root/somang-deploy-key.pub" < ~/somang-deploy-key.pub`
14. [서버] 열쇠 폴더 — `install -d -m 700 -o somangdeploy -g somangdeploy /var/lib/somangdeploy/.ssh`
15. [서버] 열쇠 등록(단추만 누르게 묶음) — `printf 'restrict,command="/usr/local/bin/somang-auto-deploy" %s\n' "$(cat /root/somang-deploy-key.pub)" >> /var/lib/somangdeploy/.ssh/authorized_keys && chown somangdeploy:somangdeploy /var/lib/somangdeploy/.ssh/authorized_keys && chmod 600 /var/lib/somangdeploy/.ssh/authorized_keys && rm /root/somang-deploy-key.pub`
16. [서버] 서버 지문 뽑기 — `awk '{print $2}' /etc/ssh/ssh_host_ed25519_key.pub`
17. [내 PC] **금고 2: 서버 주소** — `gh secret set SOMANG_SSH_HOST -R dadowoom/somang-memorial` → 물으면 서버 주소를 붙여 넣고 Enter.
18. [내 PC] **금고 3: 계정** — `gh secret set SOMANG_SSH_USER -R dadowoom/somang-memorial --body somangdeploy`
19. [내 PC] **금고 4: 서버 지문** — `gh secret set SOMANG_SSH_HOST_ED25519_KEY -R dadowoom/somang-memorial` → 16번에서 나온 한 줄을 붙여 넣고 Enter.
    (SSH 포트가 22 가 아니면: `gh variable set SOMANG_SSH_PORT -R dadowoom/somang-memorial --body <포트>`)
20. [내 PC] 접속 시험 — `ssh -i ~/somang-deploy-key -o IdentitiesOnly=yes somangdeploy@<서버 주소> status` → 3번과 같은 40자. 비밀번호를 묻거나 거절되면 멈추고 클로드에게.
21. [내 PC] 막힘 시험 — `ssh -i ~/somang-deploy-key -o IdentitiesOnly=yes somangdeploy@<서버 주소> id` → **"허용되지 않은 요청입니다."** 가 나와야 합니다.
22. [내 PC] 남은 열쇠 지우기 — `rm ~/somang-deploy-key ~/somang-deploy-key.pub` → 개인 열쇠는 깃허브 금고에만 남습니다.
23. 끝. 다음부터 09:00~18:00 병합은 바로, 그 밖은 다음 날 09:00 에 나갑니다. 지금 바로 보려면 Actions → Deploy Production → Run workflow. 빨간불이면 클로드에게 보여 주세요.

> 켜는 순간 main 에 있는데 아직 운영에 안 나간 커밋이 있으면 **첫 실행 때 함께 나갑니다.**
> 그 사이에 DB 구조 변경(drizzle)이 섞여 있으면 자동으로는 안 나가고 경고만 남습니다 — 그때는 지금처럼 손으로 한 번 배포하면, 그다음부터 자동이 이어받습니다.

## 6. 배포 뒤 확인할 곳

1. 깃허브 Actions 기록: 사전 확인 → 검사 → 배포 가 모두 초록불인지. 마지막 "공개 주소 확인" 이 첫 화면 200, `/readyz` 200 인지.
2. 서버 기록: `tail -40 /root/somang-auto-deploy.log` — 끝에 `배포 완료:` 와 `되돌리기:` 한 줄이 있어야 합니다.
3. 화면: 공개 검색·추모관 한 곳·로그인 화면이 열리는지.

## 7. 되돌리는 법

- **자동**: 건강 확인·다른 사이트·다른 PM2 앱 확인이 실패하면 단추가 직전 릴리스로 되돌리고 다시 켭니다.
- **손으로**: 서버 기록(`/root/somang-auto-deploy.log`)의 마지막 **"되돌리기:"** 한 줄을 복사해 실행합니다.
  모양은 [INCIDENT_RUNBOOK.md 7절](INCIDENT_RUNBOOK.md)과 같습니다(권한 적용 → current 되돌리기 → 정식 재시작).
- DB 는 이 절차에서 바뀌지 않으므로 코드만 되돌리면 끝입니다.
- 실패 표시를 지우고 같은 버전을 다시 시도하려면: `rm /var/www/somang-memorial/.auto-deploy-failed`

## 8. 끄는 법

- 잠깐 멈추려면: 깃허브 Actions 화면에서 이 워크플로를 **Disable** 합니다.
- 금고의 값을 지우면: 예약이 돌아도 **아무것도 하지 않고 끝납니다.**
- 서버 쪽에서 완전히 막으려면: `rm /etc/sudoers.d/somang-deploy` (열쇠가 남아 있어도 단추를 못 누릅니다).

## 9. 알아 둘 위험

1. **낮에 재시작됩니다** — 09:00~18:00 병합은 바로 나가므로 소망만 몇 초 끊깁니다(사장님 결정, 2026-09-25). 다른 서비스는 재시작하지 않습니다.
2. **서버에서 설치·빌드를 합니다** — 지금 손 배포와 같습니다. 몇 분 동안 서버 CPU 를 쓰고, 릴리스 하나에 약 600MB 가 듭니다. 디스크 여유가 3GB 보다 적으면 시작하지 않습니다.
3. **main 에 병합할 수 있는 사람 = 운영 서버에서 root 로 빌드를 돌릴 수 있는 사람** 입니다(손 배포도 같지만, 이제 사람 확인 없이 돕니다). 깃허브 계정 2단계 인증을 꼭 켜고, 저장소 쓰기 권한을 가진 사람을 좁게 지킵니다.
4. **단추 파일은 저장소를 고쳐도 서버에 자동으로 안 바뀝니다** — `scripts/deploy-production-remote.sh` 를 고쳤으면 5장 8번(설치)을 다시 합니다. 일부러 이렇게 했습니다(깃허브가 root 도구를 바꿀 수 없게).
5. **손 배포와 섞어도 됩니다** — 단추는 current 릴리스의 git 기록을 읽습니다. 다만 main 이 아닌 가지를 손으로 올리면 자동 배포가 멈추고 경고만 남깁니다.
6. **다른 PM2 앱이 마침 그때 재시작되면** 소망 배포를 되돌립니다(안전 쪽으로 판단). 다음 새 커밋 때 다시 시도합니다.
7. **예전 화면을 열어 둔 사람**은 배포 뒤 새로고침이 필요할 수 있습니다(손 배포와 같음).
8. 워크플로는 깃허브에서 아직 한 번도 안 돌았습니다. 병합 뒤 첫 초록불을 꼭 보세요. 단추의 되돌리기 흐름은 가짜 폴더 시험(`scripts/deploy-production-remote.test.sh`)으로 확인하며, PR 검사(ci.yml)에서도 리눅스로 돕니다.
