#!/bin/bash
# 자동 배포 단추(scripts/deploy-production-remote.sh)를 가짜 폴더에서 끝까지 돌려 봅니다.
# 실제 서버·PM2·DB·네트워크에는 닿지 않습니다. root 가 아닌 계정에서만 돕니다.
#
#   bash scripts/deploy-production-remote.test.sh
#
# 확인하는 것: 기준 버전 모름 → 멈춤 / 정상 배포 / 같은 버전 → 그냥 끝 /
# 건강 확인 실패 → 직전 릴리스로 되돌림·실패 표시 / 빌드 실패 → current 그대로 /
# 배포 전 백업 실패 → current 그대로 / 다른 PM2 앱 변화 → 되돌림 /
# DB 구조 변경·main 에 없는 커밋 → 거절 / 문지기가 다른 명령을 막음.
set -Eeuo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy-production-remote.sh"
T="$(mktemp -d)"
trap 'rm -rf "${T}"' EXIT
export MSYS=winsymlinks:sys # 윈도우 Git Bash 에서도 진짜 링크처럼 다루기 위함(리눅스에서는 무시됨)

export SOMANG_DEPLOY_TEST_ROOT="${T}/root"
export SOMANG_DEPLOY_TEST_REPO="${T}/origin"
R="${SOMANG_DEPLOY_TEST_ROOT}"
BASE="${R}/var/www/somang-memorial"
CALLS="${R}/calls.log"
mkdir -p "${R}/bin" "${R}/etc" "${BASE}/releases"
: >"${CALLS}"

pass=0
ok() { pass=$((pass + 1)); printf 'ok %d - %s\n' "${pass}" "$*"; }
die() { printf 'FAIL - %s\n' "$*" >&2; printf -- '--- deploy.log ---\n' >&2; tail -40 "${R}/deploy.log" >&2 2>/dev/null || true; exit 1; }

# ── 가짜 도구들 ─────────────────────────────────────────────────────────────
cat >"${R}/bin/pnpm" <<'EOF'
#!/bin/bash
case "$1" in
  install) mkdir -p node_modules; echo "pnpm $*" >>"${SOMANG_DEPLOY_TEST_ROOT}/calls.log" ;;
  run)
    content="$(cat app.txt)"
    [ "${content}" != "BUILDFAIL" ] || exit 1
    mkdir -p dist
    printf '%s\n' "${content}" >dist/index.js
    ;;
esac
EOF
cat >"${R}/bin/perm-tool" <<'EOF'
#!/bin/bash
echo "perm $*" >>"${SOMANG_DEPLOY_TEST_ROOT}/calls.log"
EOF
cat >"${R}/bin/archive-tool" <<'EOF'
#!/bin/bash
echo "archive $*" >>"${SOMANG_DEPLOY_TEST_ROOT}/calls.log"
EOF
cat >"${R}/bin/pm2-restart" <<'EOF'
#!/bin/bash
[ "$*" = "somang-memorial" ] || exit 2
echo "restart" >>"${SOMANG_DEPLOY_TEST_ROOT}/calls.log"
if [ -f "${SOMANG_DEPLOY_TEST_ROOT}/flag-other-app-restarts" ]; then
  n="$(cat "${SOMANG_DEPLOY_TEST_ROOT}/other-pid" 2>/dev/null || echo 100)"
  echo $((n + 1)) >"${SOMANG_DEPLOY_TEST_ROOT}/other-pid"
fi
EOF
cat >"${R}/bin/pm2-jlist" <<'EOF'
#!/bin/bash
p="$(cat "${SOMANG_DEPLOY_TEST_ROOT}/other-pid" 2>/dev/null || echo 100)"
printf '[{"name":"somang-memorial","pid":%s,"pm2_env":{"restart_time":1}},{"name":"other-app","pid":%s,"pm2_env":{"restart_time":0}}]\n' "$RANDOM" "${p}"
EOF
# curl: current 가 가리키는 빌드 내용에 따라 건강 응답을 흉내 냅니다.
cat >"${R}/bin/curl" <<'EOF'
#!/bin/bash
out=/dev/null url=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    -m|-w) shift 2 ;;
    -*) shift ;;
    *) url="$1"; shift ;;
  esac
done
app="$(cat "${SOMANG_DEPLOY_TEST_ROOT}/var/www/somang-memorial/current/dist/index.js" 2>/dev/null || true)"
case "${url}" in
  */healthz) printf '{"status":"ok"}' >"${out}"; printf 200 ;;
  */readyz)
    if [ "${app}" = "BROKEN" ]; then printf '{"status":"not ready","database":"error"}' >"${out}"; printf 503
    else printf '{"status":"ready","database":"ok"}' >"${out}"; printf 200; fi ;;
  */api/trpc/memorial.list) printf '{"result":{"data":{"json":[]}}}' >"${out}"; printf 200 ;;
  *) printf 000 ;;
esac
EOF
chmod +x "${R}/bin/"*

printf 'RCLONE_REMOTE=fakecrypt:services\n' >"${R}/etc/somang-auto-deploy.conf"

# ── 가짜 깃허브 저장소 ───────────────────────────────────────────────────────
O="${SOMANG_DEPLOY_TEST_REPO}"
git init -q -b main "${O}"
g() { git -C "${O}" -c core.autocrlf=false -c user.name=test -c user.email=test@example.invalid "$@"; }
mkdir -p "${O}/scripts"
cat >"${O}/scripts/backup.sh" <<'EOF'
#!/bin/bash
[ -n "${DATABASE_URL:-}" ] || exit 1
[ "${RCLONE_REMOTE:-}" != "fake:fail" ] || exit 1
echo "backup ${RCLONE_REMOTE}" >>"${SOMANG_DEPLOY_TEST_ROOT}/calls.log"
EOF
commit() { printf '%s\n' "$1" >"${O}/app.txt"; g add -A; g commit -q -m "$1"; g rev-parse HEAD; }
C1="$(commit v1)"
C2="$(commit v2)"
C3="$(commit BROKEN)"
C5="$(commit BUILDFAIL)"
C6="$(commit v6)"
C7="$(commit v7)"
C8="$(commit v8)"
mkdir -p "${O}/drizzle"
printf 'ALTER TABLE x ADD y INT;\n' >"${O}/drizzle/0099_test.sql"
C4="$(commit v4-with-db-change)"
g checkout -q -b side "${C2}"
CS="$(commit side-branch)"
g checkout -q main

# ── 처음 운영 상태: 기준 버전 표시가 없는 옛 릴리스 ─────────────────────────────
REL0="${BASE}/releases/20200101_000000"
mkdir -p "${REL0}/dist"
printf 'v1\n' >"${REL0}/dist/index.js"
printf 'DATABASE_URL=mysql://user:pass@127.0.0.1:3306/db\n' >"${REL0}/.env"
ln -sfn "${REL0}" "${BASE}/current"

run() { bash "${SCRIPT}" "$@"; }
current_commit() { tr -d '[:space:]' <"$(readlink -f "${BASE}/current")/.deployed-commit" 2>/dev/null || echo none; }
count() { grep -c "^$1" "${CALLS}" || true; }
# 마지막 배포 기록에 그 까닭이 적혔는지 봅니다.
said() { awk '/── 자동 배포 시작/ {buf=""} {buf=buf $0 "\n"} END {printf "%s", buf}' "${R}/deploy.log" | grep -q -- "$1" || die "기록에 '$1' 이 없음"; }
releases() { find "${BASE}/releases" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' '; }

# 1. 기준 버전 모름 → 상태는 unknown, 배포는 멈춤(3)
[ "$(run status | head -1)" = "unknown" ] || die "기준 버전이 없으면 unknown 이어야 함"
set +e; run deploy "${C2}" >/dev/null; code=$?; set -e
[ "${code}" = "3" ] || die "기준 버전이 없으면 3 으로 멈춰야 함 (받은 값 ${code})"
[ "$(releases)" = "1" ] || die "기준 버전이 없으면 새 폴더를 만들면 안 됨"
ok "기준 버전을 모르면 아무것도 하지 않음"

# 2. 기준 버전 적은 뒤 정상 배포
printf '%s\n' "${C1}" >"${REL0}/.deployed-commit"
[ "$(run status | head -1)" = "${C1}" ] || die "status 가 기준 버전을 돌려줘야 함"
run deploy "${C2}" >/dev/null || die "정상 배포가 실패함"
[ "$(current_commit)" = "${C2}" ] || die "current 가 새 버전이어야 함"
[ "$(cat "$(readlink -f "${BASE}/current")/dist/index.js")" = "v2" ] || die "새 빌드가 올라가야 함"
[ "$(count restart)" = "1" ] || die "재시작은 한 번"
[ "$(count backup)" = "1" ] || die "배포 전 백업이 한 번 돌아야 함"
[ "$(count 'pnpm install --frozen-lockfile --config.package-import-method=copy')" = "1" ] || die "복사 방식 설치여야 함"
grep -q "^perm --release .* --check" "${CALLS}" && grep -q "^perm --release .* --apply" "${CALLS}" || die "권한 도구 점검·적용"
[ "$(count archive)" = "1" ] || die "보관 도구가 성공 뒤 한 번"
case "$(uname -s)" in
  Linux) [ "$(stat -c '%a' "$(readlink -f "${BASE}/current")/.env")" = "600" ] || die ".env 는 600 으로 복사" ;;
esac
REL2="$(readlink -f "${BASE}/current")"
ok "정상 배포: 복사 설치·권한 도구·백업·재시작·보관 순서"

# 3. 같은 버전 → 바로 끝
: >"${CALLS}"
run deploy "${C2}" >/dev/null || die "같은 버전은 0 으로 끝나야 함"
[ ! -s "${CALLS}" ] || die "같은 버전이면 아무 도구도 부르면 안 됨"
ok "같은 버전이면 아무것도 하지 않음"

# 4. 건강 확인 실패 → 직전 릴리스로 되돌림 + 실패 표시
: >"${CALLS}"
set +e; run deploy "${C3}" >/dev/null; code=$?; set -e
[ "${code}" != "0" ] || die "건강 확인 실패는 실패로 끝나야 함"
[ "$(readlink -f "${BASE}/current")" = "${REL2}" ] || die "직전 릴리스로 되돌아가야 함"
[ "$(current_commit)" = "${C2}" ] || die "되돌린 뒤 운영 버전은 v2"
[ "$(count restart)" = "2" ] || die "새 버전 재시작 + 되돌리기 재시작 = 2번"
grep -q "^perm --release ${REL2} --apply" "${CALLS}" || die "되돌릴 때 직전 릴리스 권한을 다시 적용해야 함"
[ "$(count archive)" = "0" ] || die "실패하면 보관 도구를 부르면 안 됨"
[ "$(run status | sed -n 2p)" = "failed ${C3}" ] || die "실패 표시가 status 에 보여야 함"
said "건강 확인이 실패했습니다"
said "되돌리기 뒤 건강 확인 통과"
ok "건강 확인이 실패하면 직전 릴리스로 되돌림"

# 5. 실패한 같은 버전 다시 요청 → 6 으로 멈춤
set +e; run deploy "${C3}" >/dev/null; code=$?; set -e
[ "${code}" = "6" ] || die "실패했던 버전은 6 으로 멈춰야 함 (받은 값 ${code})"
ok "실패했던 버전을 매일 되풀이하지 않음"

# 6. 빌드 실패 → current 그대로, 재시작 없음, 새 폴더 치움
: >"${CALLS}"
before="$(releases)"
set +e; run deploy "${C5}" >/dev/null; code=$?; set -e
[ "${code}" != "0" ] || die "빌드 실패는 실패로 끝나야 함"
[ "$(readlink -f "${BASE}/current")" = "${REL2}" ] || die "빌드 실패면 current 그대로"
[ "$(count restart)" = "0" ] || die "빌드 실패면 재시작하면 안 됨"
[ "$(releases)" = "${before}" ] || die "빌드 실패한 새 폴더는 치워야 함"
said "설치 또는 빌드가 실패했습니다"
ok "빌드가 실패하면 운영은 그대로"

# 7. 배포 전 백업 실패 → current 그대로
printf 'RCLONE_REMOTE=fake:fail\n' >"${R}/etc/somang-auto-deploy.conf"
: >"${CALLS}"
set +e; run deploy "${C6}" >/dev/null; code=$?; set -e
[ "${code}" != "0" ] || die "백업 실패는 실패로 끝나야 함"
[ "$(readlink -f "${BASE}/current")" = "${REL2}" ] || die "백업 실패면 current 그대로"
[ "$(count restart)" = "0" ] || die "백업 실패면 재시작하면 안 됨"
said "배포 전 백업이 실패했습니다"
printf 'RCLONE_REMOTE=fakecrypt:services\n' >"${R}/etc/somang-auto-deploy.conf"
ok "배포 전 백업이 실패하면 멈춤"

# 8. 고친 새 버전 → 성공, 실패 표시 지워짐
run deploy "${C6}" >/dev/null || die "고친 새 버전은 성공해야 함"
[ "$(current_commit)" = "${C6}" ] || die "운영 버전은 v6"
[ "$(run status | wc -l | tr -d ' ')" = "1" ] || die "성공하면 실패 표시가 지워져야 함"
REL6="$(readlink -f "${BASE}/current")"
ok "고친 새 버전은 나가고 실패 표시가 지워짐"

# 9. 다른 PM2 앱이 바뀌면 되돌림
touch "${R}/flag-other-app-restarts"
set +e; run deploy "${C7}" >/dev/null; code=$?; set -e
rm -f "${R}/flag-other-app-restarts"
[ "${code}" != "0" ] || die "다른 앱이 바뀌면 실패로 끝나야 함"
[ "$(readlink -f "${BASE}/current")" = "${REL6}" ] || die "다른 앱이 바뀌면 되돌려야 함"
said "다른 PM2 앱의 상태가 배포 전과 다릅니다"
ok "다른 PM2 앱 상태가 바뀌면 되돌림"

# 10. DB 구조 변경이 섞인 버전 → 거절(4), current 그대로
set +e; run deploy "${C4}" >/dev/null; code=$?; set -e
[ "${code}" = "4" ] || die "DB 구조 변경은 4 로 거절 (받은 값 ${code})"
[ "$(readlink -f "${BASE}/current")" = "${REL6}" ] || die "거절하면 current 그대로"
said "DB 구조(drizzle)"
ok "DB 구조가 바뀐 버전은 자동으로 내보내지 않음"

# 11. main 에 없는 커밋 → 거절(4)
set +e; run deploy "${CS}" >/dev/null; code=$?; set -e
[ "${code}" = "4" ] || die "main 밖 커밋은 4 로 거절 (받은 값 ${code})"
said "main 기록에 없습니다"
ok "main 에 없는 커밋은 거절"

# 12. 옛 버전으로 되돌리는 요청 → 거절(4)
set +e; run deploy "${C2}" >/dev/null; code=$?; set -e
[ "${code}" = "4" ] || die "옛 버전 요청은 4 로 거절 (받은 값 ${code})"
said "앞 기록에 없습니다"
ok "지금보다 옛 버전은 거절"

# 13. 문지기: 정해진 두 요청만 통과
set +e
SSH_ORIGINAL_COMMAND='rm -rf /' bash "${SCRIPT}" >/dev/null 2>&1; c1=$?
SSH_ORIGINAL_COMMAND='deploy abc; id' bash "${SCRIPT}" >/dev/null 2>&1; c2=$?
SSH_ORIGINAL_COMMAND="deploy ${C8} extra" bash "${SCRIPT}" >/dev/null 2>&1; c3=$?
bash "${SCRIPT}" >/dev/null 2>&1; c4=$?
set -e
[ "${c1}${c2}${c3}${c4}" = "2222" ] || die "문지기는 다른 요청을 2 로 막아야 함 (${c1}${c2}${c3}${c4})"
[ "$(SSH_ORIGINAL_COMMAND=status bash "${SCRIPT}" | head -1)" = "${C6}" ] || die "문지기 status"
SSH_ORIGINAL_COMMAND="deploy ${C8}" bash "${SCRIPT}" >/dev/null || die "문지기 deploy"
[ "$(current_commit)" = "${C8}" ] || die "문지기로 들어온 배포가 반영되어야 함"
ok "문지기는 status / deploy <40자> 만 통과"

# 14. 시험 설정 없이 root 가 아닌 계정으로 부르면 멈춤
set +e; env -u SOMANG_DEPLOY_TEST_ROOT bash "${SCRIPT}" status >/dev/null 2>&1; code=$?; set -e
[ "${code}" = "1" ] || die "root 가 아니면 멈춰야 함 (받은 값 ${code})"
ok "운영 모드는 root 로만"

printf '모두 통과 (%d개)\n' "${pass}"
