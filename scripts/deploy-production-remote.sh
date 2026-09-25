#!/bin/bash
# 소망 추모관 자동 배포 단추 (초안)
#
# 서버에 root 소유(root:root 0755)로 /usr/local/bin/somang-auto-deploy 에 설치합니다.
# 저장소의 이 파일을 고쳐도 서버 사본은 저절로 바뀌지 않습니다(사람이 다시 설치해야 함).
#
# 한 파일이 두 가지 역할을 합니다.
#   1) 문지기 — 배포 전용 계정(somangdeploy)의 SSH 열쇠에 "이 명령만" 으로 묶여 있습니다.
#      깃허브가 보낸 요청(status / deploy <커밋 40자>)만 받아서 sudo 로 2) 를 부릅니다.
#   2) 단추 — root 로 돌며, 문서(docs/HANDOVER.md 4절)의 정식 배포 순서를 그대로 합니다.
#        기준 버전 확인 → 깃허브에서 그 커밋 받기 → main 기록·DB 구조·부품 변경 재확인 →
#        .env 복사 → 복사 방식 설치·빌드 → 링크 수 1 인 파일만 root 로 → 권한 도구 점검·적용 →
#        배포 전 DB·사진 백업 → current 바꾸기 → 정식 재시작 → 건강 확인(DB 읽기까지) →
#        다른 사이트·다른 PM2 앱 그대로인지 확인 → 한 곳이라도 실패하면 직전 릴리스로 되돌림.
#
# 경로·앱 이름·도구 위치는 모두 아래에 고정입니다. 배포 계정이 바꿀 수 있는 값은 커밋 번호 하나뿐입니다.
# Nginx·크론·다른 PM2 앱은 바꾸지 않습니다(다른 사이트는 응답 번호만, 다른 앱은 개수·지문만 읽습니다).
# 하드링크(링크 수 2 이상) 파일의 주인은 절대 바꾸지 않습니다.
set -Eeuo pipefail

SELF=/usr/local/bin/somang-auto-deploy
TEST_ROOT="${SOMANG_DEPLOY_TEST_ROOT:-}"

usage() {
  printf '%s\n' '사용법: somang-auto-deploy status | somang-auto-deploy deploy <커밋 40자>' >&2
}

# ── 1) 문지기: SSH 로 들어온 요청을 좁혀서 단추로 넘깁니다 ─────────────────────
gate() {
  local request="${SSH_ORIGINAL_COMMAND:-}" sha
  local button=(sudo -n "${SELF}")
  if [ -n "${TEST_ROOT}" ]; then
    button=(bash "$0")
  fi
  case "${request}" in
    status)
      exec "${button[@]}" status
      ;;
    "deploy "*)
      sha="${request#deploy }"
      if [[ "${sha}" =~ ^[0-9a-f]{40}$ ]]; then
        exec "${button[@]}" deploy "${sha}"
      fi
      ;;
  esac
  printf '%s\n' '허용되지 않은 요청입니다.' >&2
  exit 2
}

if [ "$#" -eq 0 ]; then
  if [ -n "${SSH_ORIGINAL_COMMAND+x}" ]; then
    gate
  fi
  usage
  exit 2
fi

# ── 2) 단추: 실행 주체 확인 ──────────────────────────────────────────────────
if [ -z "${TEST_ROOT}" ]; then
  if [ "$(id -u)" != "0" ]; then
    printf '%s\n' 'root 로만 실행합니다(배포 계정은 sudo 로 부릅니다).' >&2
    exit 1
  fi
  for _test_var in ${!SOMANG_DEPLOY_TEST_@}; do
    printf '%s\n' "운영에서는 시험용 설정(${_test_var})을 받지 않습니다." >&2
    exit 1
  done
else
  if [ "$(id -u)" = "0" ]; then
    printf '%s\n' '시험 모드는 root 로 돌리지 않습니다.' >&2
    exit 1
  fi
fi

# ── 고정값 ───────────────────────────────────────────────────────────────────
if [ -z "${TEST_ROOT}" ]; then
  BASE=/var/www/somang-memorial
  CONFIG_FILE=/etc/somang-auto-deploy.conf
  LOG_FILE=/root/somang-auto-deploy.log
  LOCK_FILE=/run/lock/somang-auto-deploy.lock
  REPO_URL=https://github.com/dadowoom/somang-memorial.git
  PERM_TOOL=(/usr/bin/python3 -I /usr/local/bin/somang-runtime-permissions.py)
  ARCHIVE_TOOL=(/usr/bin/python3 -I /usr/local/bin/somang-release-archive.py)
  RESTART=(/usr/local/bin/somang-pm2-restart somang-memorial)
  PM2_JLIST=(/usr/bin/env -i HOME=/root PATH=/usr/bin:/bin PM2_HOME=/root/.pm2
    /usr/bin/node /usr/lib/node_modules/pm2/bin/pm2 jlist)
  NODE_BIN=/usr/bin/node
  NGINX_SITES_DIR=/etc/nginx/sites-enabled
  MIN_FREE_KB=$((3 * 1024 * 1024))
  FIX_OWNERSHIP=1
  export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
  export HOME=/root
else
  BASE="${TEST_ROOT}/var/www/somang-memorial"
  CONFIG_FILE="${TEST_ROOT}/etc/somang-auto-deploy.conf"
  LOG_FILE="${TEST_ROOT}/deploy.log"
  LOCK_FILE="${TEST_ROOT}/deploy.lock"
  REPO_URL="${SOMANG_DEPLOY_TEST_REPO:?시험용 저장소 경로가 필요합니다}"
  PERM_TOOL=("${TEST_ROOT}/bin/perm-tool")
  ARCHIVE_TOOL=("${TEST_ROOT}/bin/archive-tool")
  RESTART=("${TEST_ROOT}/bin/pm2-restart" somang-memorial)
  PM2_JLIST=("${TEST_ROOT}/bin/pm2-jlist")
  NODE_BIN=node
  NGINX_SITES_DIR="${TEST_ROOT}/etc/nginx/sites-enabled"
  MIN_FREE_KB=0
  FIX_OWNERSHIP=0
  export PATH="${TEST_ROOT}/bin:${PATH}"
fi
RELEASES="${BASE}/releases"
CURRENT="${BASE}/current"
CURRENT_TMP="${BASE}/current.tmp"
FAILED_MARK="${BASE}/.auto-deploy-failed"
APP_URL=http://127.0.0.1:3050
HEALTH_ATTEMPTS=20
HEALTH_DELAY_SECONDS=3
if [ -n "${TEST_ROOT}" ]; then
  HEALTH_ATTEMPTS=2
  HEALTH_DELAY_SECONDS=0
fi

umask 022

# 기록은 서버 파일에 자세히, 화면(= 깃허브 기록, 공개)에는 요약만 남깁니다.
log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*" >>"${LOG_FILE}" 2>/dev/null || true
  printf '[deploy] %s\n' "$*" 2>/dev/null || true
}

is_sha() { [[ "${1:-}" =~ ^[0-9a-f]{40}$ ]]; }

# releases/YYYYMMDD_HHMMSS 형식의 진짜 폴더만 릴리스로 인정합니다.
is_release_dir() {
  case "$1" in
    "${RELEASES}"/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_[0-9][0-9][0-9][0-9][0-9][0-9]) ;;
    *) return 1 ;;
  esac
  [ -d "$1" ] && [ ! -L "$1" ]
}

current_release() {
  local rel
  rel="$(readlink -f "${CURRENT}" 2>/dev/null)" || return 1
  is_release_dir "${rel}" || return 1
  printf '%s' "${rel}"
}

# 지금 운영 버전: 릴리스 안의 .deployed-commit(자동 배포가 적음) 또는 릴리스의 git 기록.
# 둘 다 있는데 서로 다르면 "모름" 으로 봅니다.
commit_of_release() {
  local rel="$1" marked="" from_git=""
  if [ -f "${rel}/.deployed-commit" ]; then
    marked="$(tr -d '[:space:]' <"${rel}/.deployed-commit")"
    is_sha "${marked}" || marked=""
  fi
  if [ -e "${rel}/.git" ]; then
    from_git="$(git -c safe.directory='*' -C "${rel}" rev-parse --verify -q 'HEAD^{commit}' 2>/dev/null || true)"
    is_sha "${from_git}" || from_git=""
  fi
  if [ -n "${marked}" ] && [ -n "${from_git}" ] && [ "${marked}" != "${from_git}" ]; then
    return 1
  fi
  if [ -n "${marked}" ]; then
    printf '%s' "${marked}"
  elif [ -n "${from_git}" ]; then
    printf '%s' "${from_git}"
  else
    return 1
  fi
}

deployed_commit() {
  local rel
  rel="$(current_release)" || return 1
  commit_of_release "${rel}"
}

# ── status: 깃허브가 사전 확인 때 읽는 두 줄 ──────────────────────────────────
do_status() {
  local deployed failed=""
  deployed="$(deployed_commit || true)"
  printf '%s\n' "${deployed:-unknown}"
  if [ -f "${FAILED_MARK}" ]; then
    failed="$(tr -d '[:space:]' <"${FAILED_MARK}")"
    if is_sha "${failed}"; then
      printf 'failed %s\n' "${failed}"
    fi
  fi
}

# ── 설정 파일(root 전용): 문서로 확인할 수 없던 값만 둡니다 ─────────────────────
RCLONE_REMOTE=""
read_config() {
  [ -f "${CONFIG_FILE}" ] || { log "설정 파일이 없습니다: ${CONFIG_FILE} (docs/AUTO_DEPLOY_SETUP.md)"; return 1; }
  if [ -z "${TEST_ROOT}" ]; then
    local owner mode
    owner="$(stat -c '%u' "${CONFIG_FILE}")"
    mode="$(stat -c '%a' "${CONFIG_FILE}")"
    if [ "${owner}" != "0" ] || [ "${mode}" != "600" ]; then
      log "설정 파일은 root 소유 600 이어야 합니다(지금 ${owner} ${mode})."
      return 1
    fi
  fi
  local line key value
  while IFS= read -r line || [ -n "${line}" ]; do
    line="${line%$'\r'}"
    case "${line}" in ''|'#'*) continue ;; esac
    key="${line%%=*}"
    value="${line#*=}"
    # 크론 파일에서 그대로 옮겨 온 따옴표는 벗깁니다.
    value="${value#\"}"
    value="${value%\"}"
    value="${value#\'}"
    value="${value%\'}"
    case "${key}" in
      RCLONE_REMOTE)
        if [[ "${value}" =~ ^[A-Za-z0-9_-]+:[A-Za-z0-9._/-]*$ ]]; then
          RCLONE_REMOTE="${value}"
        else
          log "설정의 RCLONE_REMOTE 모양이 올바르지 않습니다."
          return 1
        fi
        ;;
      *) log "설정 파일에 모르는 항목이 있습니다: ${key}"; return 1 ;;
    esac
  done <"${CONFIG_FILE}"
  [ -n "${RCLONE_REMOTE}" ] || { log "설정에 RCLONE_REMOTE 가 없습니다."; return 1; }
}

# ── 건강 확인: 살아 있음 / DB 연결 / DB 를 실제로 읽는 요청 ──────────────────────
BODY_FILE=""
check_app_once() {
  local code
  code="$(curl -s -o "${BODY_FILE}" -m 10 -w '%{http_code}' "${APP_URL}/healthz" || true)"
  [ "${code}" = "200" ] && grep -q '"status":"ok"' "${BODY_FILE}" || { printf 'healthz %s' "${code:-없음}"; return 1; }
  code="$(curl -s -o "${BODY_FILE}" -m 10 -w '%{http_code}' "${APP_URL}/readyz" || true)"
  [ "${code}" = "200" ] && grep -q '"database":"ok"' "${BODY_FILE}" || { printf 'readyz %s' "${code:-없음}"; return 1; }
  code="$(curl -s -o "${BODY_FILE}" -m 15 -w '%{http_code}' "${APP_URL}/api/trpc/memorial.list" || true)"
  [ "${code}" = "200" ] && grep -q '"result"' "${BODY_FILE}" || { printf 'memorial.list %s' "${code:-없음}"; return 1; }
  return 0
}

wait_until_healthy() {
  local attempt=1 why
  while [ "${attempt}" -le "${HEALTH_ATTEMPTS}" ]; do
    if why="$(check_app_once)"; then
      log "건강 확인 통과 (${attempt}번째): healthz·readyz·DB 읽기 모두 정상"
      return 0
    fi
    log "건강 확인 ${attempt}/${HEALTH_ATTEMPTS} 실패 (${why})"
    attempt=$((attempt + 1))
    if [ "${attempt}" -le "${HEALTH_ATTEMPTS}" ]; then
      sleep "${HEALTH_DELAY_SECONDS}"
    fi
  done
  return 1
}

# ── 다른 사이트: 번호와 응답 코드만 남깁니다(주소는 출력하지 않음) ───────────────
other_sites_status() {
  local names name code index=0 out=""
  names="$(grep -rhoE '^[[:space:]]*server_name[[:space:]]+[^;]+;' "${NGINX_SITES_DIR}/" 2>/dev/null \
    | sed -E 's/^[[:space:]]*server_name[[:space:]]+//; s/;[[:space:]]*$//' \
    | tr ' ' '\n' | sed '/^$/d' | grep -vE '^(_|localhost)$' | sort -u)" || true
  for name in ${names}; do
    index=$((index + 1))
    code="$(curl -s -o /dev/null -m 8 -w '%{http_code}' "https://${name}/" || true)"
    out="${out}#${index} ${code:-000} "
  done
  printf '%s' "${out}"
}

# ── 다른 PM2 앱: 이름·PID·재시작 횟수의 지문만 비교합니다(이름·설정은 출력하지 않음) ──
pm2_others_digest() {
  "${PM2_JLIST[@]}" 2>/dev/null | "${NODE_BIN}" -e '
let s = "";
process.stdin.on("data", d => (s += d)).on("end", () => {
  const apps = JSON.parse(s);
  const rows = apps
    .filter(p => p.name !== "somang-memorial")
    .map(p => [p.name, p.pid, p.pm2_env && p.pm2_env.restart_time].join(" "))
    .sort();
  const h = require("crypto").createHash("sha256").update(rows.join("\n")).digest("hex");
  process.stdout.write(rows.length + "개 " + h.slice(0, 12));
});' 2>/dev/null
}

# ── 상태 ─────────────────────────────────────────────────────────────────────
SHA=""
REL=""
PREV_REL=""
CREATED_REL=0
SWITCHED=0
DEPLOY_DONE=0

switch_current_to() {
  ln -sfn "$1" "${CURRENT_TMP}"
  mv -Tf "${CURRENT_TMP}" "${CURRENT}"
}

remove_unused_release() {
  # 이번에 새로 만들었고 current 가 가리키지 않는 폴더만 지웁니다.
  # (하드링크는 이름만 지워지므로 다른 서비스의 같은 파일에는 영향이 없습니다.)
  local cur
  cur="$(current_release || true)"
  if [ -n "${REL}" ] && is_release_dir "${REL}" && [ "${REL}" != "${cur}" ] && [ "${REL}" != "${PREV_REL}" ]; then
    rm -rf -- "${REL}"
    log "쓰지 않은 새 릴리스 폴더를 치웠습니다 ($(basename "${REL}"))"
  fi
}

rollback() {
  if [ -z "${PREV_REL}" ] || ! is_release_dir "${PREV_REL}"; then
    log "되돌리기 실패: 직전 릴리스를 모릅니다 — 사람이 바로 봐야 합니다"
    return 0
  fi
  log "되돌리기: 직전 릴리스 $(basename "${PREV_REL}") 로 돌아갑니다"
  "${PERM_TOOL[@]}" --release "${PREV_REL}" --apply >>"${LOG_FILE}" 2>&1 \
    || log "직전 릴리스 권한 적용 실패(계속 진행) — 기록 확인 필요"
  if ! switch_current_to "${PREV_REL}"; then
    log "current 되돌리기 실패 — 사람이 바로 봐야 합니다"
    return 0
  fi
  "${RESTART[@]}" >>"${LOG_FILE}" 2>&1 || log "되돌리기 중 재시작 실패 — 사람이 봐야 합니다"
  if wait_until_healthy; then
    log "되돌리기 뒤 건강 확인 통과 — 사이트는 이전 버전으로 돌아왔습니다"
  else
    log "되돌리기 뒤에도 건강 확인 실패 — 사람이 바로 봐야 합니다"
  fi
}

# 끝날 때 한 곳에서 판단합니다. current 를 바꾼 뒤 "성공" 표시 없이 끝나면 — 명령 실패든,
# 건강 확인 실패 뒤의 exit 든, 중간 신호든 — 반드시 직전 릴리스로 되돌립니다.
on_exit() {
  local code=$?
  trap - EXIT
  set +e
  if [ "${DEPLOY_DONE}" -ne 1 ]; then
    if [ "${SWITCHED}" -eq 1 ]; then
      [ "${code}" -ne 0 ] || code=1
      log "배포 실패(코드 ${code}) — 되돌립니다"
      rollback
      printf '%s\n' "${SHA}" >"${FAILED_MARK}" 2>/dev/null || true
      log "이 버전(${SHA})은 실패 표시를 남겼습니다. 고친 새 커밋이 오면 다시 시도합니다."
    elif [ "${CREATED_REL}" -eq 1 ]; then
      remove_unused_release
    fi
  fi
  if [ -L "${CURRENT_TMP}" ]; then
    rm -f -- "${CURRENT_TMP}"
  fi
  if [ -n "${BODY_FILE}" ]; then
    rm -f -- "${BODY_FILE}"
  fi
  exit "${code}"
}

fail() {
  log "멈춤: $*"
  exit 1
}

refuse() {
  # 자동으로 내보내면 안 되는 경우. 아무것도 바꾸지 않고 멈춥니다.
  log "자동 배포 거절: $*"
  exit 4
}

new_release_path() {
  local tries=0 path
  while [ "${tries}" -lt 5 ]; do
    path="${RELEASES}/$(date +%Y%m%d_%H%M%S)"
    if [ ! -e "${path}" ]; then
      printf '%s' "${path}"
      return 0
    fi
    tries=$((tries + 1))
    sleep 1
  done
  return 1
}

do_deploy() {
  SHA="$1"
  is_sha "${SHA}" || { usage; exit 2; }

  # 동시에 두 번 돌지 않게 잠급니다.
  exec 9>"${LOCK_FILE}"
  if command -v flock >/dev/null 2>&1; then
    flock -n 9 || { log "다른 자동 배포가 진행 중입니다. 이번 실행은 멈춥니다."; exit 5; }
  elif [ -z "${TEST_ROOT}" ]; then
    log "flock 명령이 없어 멈춥니다."
    exit 1
  fi

  trap on_exit EXIT
  trap 'exit 130' INT TERM
  # 깃허브와 연결이 끊겨도 서버 쪽 배포는 끝까지(또는 되돌리기까지) 마칩니다.
  trap '' HUP PIPE
  BODY_FILE="$(mktemp)"

  log "── 자동 배포 시작: ${SHA} ──"
  log "자세한 기록은 서버의 ${LOG_FILE} 에 남습니다."

  if [ -e "${CURRENT_TMP}" ] || [ -L "${CURRENT_TMP}" ]; then
    log "current.tmp 가 있습니다 — 다른 배포가 진행 중일 수 있어 멈춥니다."
    exit 5
  fi
  read_config || exit 1

  PREV_REL="$(current_release)" || fail "current 가 올바른 릴리스 폴더를 가리키지 않습니다."
  local deployed
  if ! deployed="$(commit_of_release "${PREV_REL}")"; then
    log "지금 운영 버전을 알 수 없어 반영하지 않습니다(docs/AUTO_DEPLOY_SETUP.md 의 기준 버전 적기)."
    exit 3
  fi
  if [ "${deployed}" = "${SHA}" ]; then
    log "이미 같은 버전이 올라가 있습니다 (${SHA}). 아무것도 하지 않고 끝냅니다."
    exit 0
  fi
  if [ -f "${FAILED_MARK}" ] && [ "$(tr -d '[:space:]' <"${FAILED_MARK}")" = "${SHA}" ]; then
    log "이 버전은 전에 실패해서 되돌렸습니다. 고친 새 커밋이 main 에 들어오면 다시 시도합니다."
    exit 6
  fi
  log "지금 운영: ${deployed} ($(basename "${PREV_REL}"))"

  if [ "${MIN_FREE_KB}" -gt 0 ]; then
    local free_kb
    free_kb="$(df -Pk "${RELEASES}" | awk 'NR==2 {print $4}')"
    [ "${free_kb:-0}" -ge "${MIN_FREE_KB}" ] || fail "디스크 여유가 3GB 보다 적습니다."
  fi

  # 1. 깃허브에서 그 커밋을 새 릴리스 폴더로 받습니다.
  REL="$(new_release_path)" || fail "새 릴리스 이름을 정하지 못했습니다."
  CREATED_REL=1
  log "새 릴리스: $(basename "${REL}")"
  git clone --quiet "${REPO_URL}" "${REL}" >>"${LOG_FILE}" 2>&1 || fail "저장소를 받지 못했습니다."
  git -C "${REL}" -c advice.detachedHead=false checkout --quiet --detach "${SHA}" >>"${LOG_FILE}" 2>&1 \
    || fail "그 커밋을 찾지 못했습니다."
  [ "$(git -C "${REL}" rev-parse HEAD)" = "${SHA}" ] || fail "받은 커밋이 요청과 다릅니다."

  # 2. 서버에서도 한 번 더 확인합니다(열쇠가 새더라도 main 의 새 버전만 나갈 수 있게).
  git -C "${REL}" merge-base --is-ancestor "${SHA}" origin/main 2>/dev/null \
    || refuse "요청한 커밋이 main 기록에 없습니다."
  git -C "${REL}" merge-base --is-ancestor "${deployed}" "${SHA}" 2>/dev/null \
    || refuse "지금 운영 버전(${deployed})이 새 버전의 앞 기록에 없습니다(옛 버전으로 되돌리기거나 다른 가지)."
  local risky
  risky="$(git -C "${REL}" diff --name-only "${deployed}" "${SHA}" -- drizzle pnpm-lock.yaml patches)" \
    || fail "바뀐 파일 목록을 만들지 못했습니다."
  if [ -n "${risky}" ]; then
    printf '%s\n' "${risky}" >>"${LOG_FILE}"
    refuse "DB 구조(drizzle)나 서버 부품(pnpm-lock.yaml·patches)이 바뀐 버전입니다. 손 배포가 필요합니다."
  fi

  # 3. 운영 .env 를 새 폴더로 복사합니다(권한 도구가 나중에 root:somangapp 0640 으로 맞춥니다).
  [ -f "${PREV_REL}/.env" ] || fail "지금 릴리스에 .env 가 없습니다."
  cp "${PREV_REL}/.env" "${REL}/.env"
  chmod 600 "${REL}/.env"
  if [ "${FIX_OWNERSHIP}" -eq 1 ]; then
    chown root:root "${REL}/.env"
  fi

  # 4. 의존성은 반드시 복사 방식으로(하드링크 금지), 그리고 빌드.
  log "설치·빌드 중 (복사 방식)"
  if ! (cd "${REL}" && export CI=true \
    && pnpm install --frozen-lockfile --config.package-import-method=copy \
    && pnpm run build) >>"${LOG_FILE}" 2>&1; then
    fail "설치 또는 빌드가 실패했습니다."
  fi
  [ -f "${REL}/dist/index.js" ] || fail "빌드 결과(dist/index.js)가 없습니다."
  log "빌드 완료"

  # 5. 주인을 root 로 — 링크 수 1 인 파일만. 링크 수 2 이상(다른 서비스와 같은 파일)은 절대 손대지 않습니다.
  if [ "${FIX_OWNERSHIP}" -eq 1 ]; then
    find "${REL}" ! -type l ! -uid 0 -links 1 -exec chown root:root {} +
    local left shared
    left="$(find "${REL}" ! -type l ! -uid 0 | wc -l)"
    shared="$(find "${REL}" ! -type l ! -uid 0 -links +1 | wc -l)"
    if [ "${left}" != "0" ] || [ "${shared}" != "0" ]; then
      fail "root 가 아닌 파일이 남았습니다(${left}개, 그중 공유 ${shared}개). 사람이 봐야 합니다."
    fi
  fi

  # 6. 운영 버전 표시를 릴리스 안에 적습니다(되돌리면 표시도 함께 되돌아갑니다).
  printf '%s\n' "${SHA}" >"${REL}/.deployed-commit"

  # 7. 권한 도구: 점검 → 적용 (current 를 바꾸기 전).
  "${PERM_TOOL[@]}" --release "${REL}" --check >>"${LOG_FILE}" 2>&1 || fail "권한 점검이 실패했습니다."
  "${PERM_TOOL[@]}" --release "${REL}" --apply >>"${LOG_FILE}" 2>&1 || fail "권한 적용이 실패했습니다."
  log "권한 준비 완료"

  # 8. 배포 전 백업(current 를 바꾸기 바로 전): DB·사진을 매일 백업과 같은 암호화 보관소로 보냅니다. 실패하면 멈춥니다.
  log "배포 전 백업 중 (DB·사진 → 암호화 보관소, 보관 기간은 매일 백업과 같은 30일)"
  local db_url
  db_url="$("${NODE_BIN}" --env-file="${REL}/.env" -e 'process.stdout.write(process.env.DATABASE_URL || "")' 2>/dev/null)" \
    || fail ".env 에서 DB 주소를 읽지 못했습니다."
  [ -n "${db_url}" ] || fail ".env 에 DATABASE_URL 이 없습니다."
  if ! (export DATABASE_URL="${db_url}" RCLONE_REMOTE; exec bash "${REL}/scripts/backup.sh") >>"${LOG_FILE}" 2>&1; then
    fail "배포 전 백업이 실패했습니다."
  fi
  db_url=""
  log "배포 전 백업 완료"

  # 9. 바꾸기 전 다른 사이트·다른 앱 상태.
  local other_before pm2_before
  other_before="$(other_sites_status)"
  pm2_before="$(pm2_others_digest || true)"
  log "배포 전 다른 사이트: ${other_before:-없음} / 다른 PM2 앱: ${pm2_before:-읽지 못함}"

  # 10. current 바꾸기 → 정식 재시작.
  switch_current_to "${REL}"
  SWITCHED=1
  log "current → $(basename "${REL}")"
  "${RESTART[@]}" >>"${LOG_FILE}" 2>&1 || fail "재시작이 실패했습니다."
  log "소망 앱만 재시작했습니다 (somang-memorial)"

  # 11. 건강 확인.
  wait_until_healthy || fail "건강 확인이 실패했습니다."

  # 12. 다른 사이트·다른 앱이 그대로인지(한 번 더 봐서 순간 오류는 걸러냅니다).
  local other_after pm2_after
  other_after="$(other_sites_status)"
  if [ "${other_after}" != "${other_before}" ]; then
    log "다른 사이트 상태가 달라 5초 뒤 다시 확인합니다"
    sleep 5
    other_after="$(other_sites_status)"
  fi
  log "배포 후 다른 사이트: ${other_after:-없음}"
  [ "${other_after}" = "${other_before}" ] || fail "다른 사이트 상태가 배포 전과 다릅니다."
  if [ -n "${pm2_before}" ]; then
    pm2_after="$(pm2_others_digest || true)"
    log "배포 후 다른 PM2 앱: ${pm2_after:-읽지 못함}"
    [ "${pm2_after}" = "${pm2_before}" ] || fail "다른 PM2 앱의 상태가 배포 전과 다릅니다."
  else
    log "다른 PM2 앱 목록을 읽지 못해 이 비교는 건너뜁니다"
  fi

  # 13. 성공. 아래 정리가 실패해도 되돌리지 않습니다.
  DEPLOY_DONE=1
  if [ -f "${FAILED_MARK}" ]; then
    rm -f -- "${FAILED_MARK}"
  fi
  log "배포 완료: ${SHA} ($(basename "${REL}"))"
  log "되돌리기: ${PERM_TOOL[*]} --release ${PREV_REL} --apply && ln -sfn ${PREV_REL} ${CURRENT_TMP} && mv -Tf ${CURRENT_TMP} ${CURRENT} && ${RESTART[*]}"

  # 옛 릴리스 보관(최근 5개·current·PM2 참조는 제자리에 남김). 실패해도 배포는 성공입니다.
  if "${ARCHIVE_TOOL[@]}" --apply >>"${LOG_FILE}" 2>&1; then
    log "옛 릴리스 보관 정리 완료"
  else
    log "옛 릴리스 보관 정리가 실패했습니다(배포는 성공). 기록을 확인하세요."
  fi
}

case "$1" in
  status)
    [ "$#" -eq 1 ] || { usage; exit 2; }
    do_status
    ;;
  deploy)
    [ "$#" -eq 2 ] || { usage; exit 2; }
    do_deploy "$2"
    ;;
  *)
    usage
    exit 2
    ;;
esac
