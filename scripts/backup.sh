#!/usr/bin/env bash
#
# 소망교회 온라인 추모관 — 매일 백업
#
# 데이터베이스와 업로드된 사진을 S3 방식 클라우드 저장소에 올린다.
# 코드는 GitHub에 있으므로 백업하지 않는다.
#
# Cloudflare R2와 네이버 클라우드 오브젝트 스토리지는 둘 다 S3 방식이라
# 아래 환경변수의 주소와 키만 바꾸면 어느 쪽에서도 그대로 동작한다.
#
# 필요한 환경변수 (서버에서만 설정, 저장소에 넣지 말 것):
#   DATABASE_URL           mysql://사용자:비밀번호@주소:포트/DB이름
#   S3_BUCKET              버킷 이름
#   S3_ENDPOINT            R2:    https://<계정ID>.r2.cloudflarestorage.com
#                          네이버: https://kr.object.ncloudstorage.com
#   AWS_ACCESS_KEY_ID      액세스 키
#   AWS_SECRET_ACCESS_KEY  시크릿 키
#
# 선택 환경변수:
#   S3_REGION       기본 auto (R2용). 네이버는 kr-standard 로 설정.
#   S3_PREFIX       버킷 안 폴더 이름. 기본 somang-memorial
#   UPLOAD_DIR      사진 폴더. 기본 /var/www/somang-memorial/uploads
#   RETENTION_DAYS  며칠 치를 보관할지. 기본 30
#   BACKUP_TMP_DIR  작업용 임시 폴더. 기본 /var/tmp
#
# 사용법:
#   ./scripts/backup.sh --check                 준비 상태만 확인 (아무것도 올리지 않음)
#   ./scripts/backup.sh                         백업 실행 (클라우드로 올림)
#   ./scripts/backup.sh --local-only            서버 안에만 백업 (클라우드 계정 없이도 됨)
#   ./scripts/backup.sh --local-only --check    서버 안 백업 준비 상태만 확인
#
# --local-only 는 클라우드 계정이 준비되기 전까지 쓰는 임시 방편이다.
# 서버가 통째로 사라지는 사고까지는 막지 못하므로, 계정이 생기면 클라우드 백업으로 바꿀 것.
#
# 복구 방법은 docs/BACKUP.md 를 참고할 것.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '[backup] %s\n' "$*"; }
fail() { printf '[backup] 실패: %s\n' "$*" >&2; exit 1; }

CHECK_ONLY=0
LOCAL_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --local-only) LOCAL_ONLY=1 ;;
    *) fail "알 수 없는 옵션입니다: $arg" ;;
  esac
done

# ---------------------------------------------------------------------------
# 1. 준비 확인
# ---------------------------------------------------------------------------

REQUIRED_CMDS="node mysqldump tar"
REQUIRED_VARS="DATABASE_URL"
if [ "$LOCAL_ONLY" = "0" ]; then
  REQUIRED_CMDS="$REQUIRED_CMDS aws"
  REQUIRED_VARS="$REQUIRED_VARS S3_BUCKET S3_ENDPOINT AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY"
fi

for cmd in $REQUIRED_CMDS; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd 명령이 없습니다. 먼저 설치해 주세요."
done

for var in $REQUIRED_VARS; do
  if [ -z "${!var:-}" ]; then
    fail "$var 환경변수가 비어 있습니다."
  fi
done

S3_REGION="${S3_REGION:-auto}"
S3_PREFIX="${S3_PREFIX:-somang-memorial}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/www/somang-memorial/uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
BACKUP_TMP_DIR="${BACKUP_TMP_DIR:-/var/tmp}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/www/somang-memorial/backups/daily}"

case "$RETENTION_DAYS" in
  ''|*[!0-9]*) fail "RETENTION_DAYS 는 숫자여야 합니다: $RETENTION_DAYS" ;;
esac
[ "$RETENTION_DAYS" -ge 1 ] || fail "RETENTION_DAYS 는 1 이상이어야 합니다."

# 아직 아무도 사진을 올리지 않았으면 사진 폴더 자체가 없다(앱이 첫 업로드 때 만든다).
# 그것 때문에 데이터베이스 백업까지 멈추면 안 되므로, 없으면 건너뛰고 계속한다.
HAS_UPLOADS=1
[ -d "$UPLOAD_DIR" ] || HAS_UPLOADS=0

[ -d "$BACKUP_TMP_DIR" ] || fail "임시 폴더가 없습니다: $BACKUP_TMP_DIR"

# DATABASE_URL 을 node 로 안전하게 분해한다.
# 비밀번호에 특수문자가 있어도 정확히 처리되고, 화면·로그에 찍히지 않는다.
DB_VARS="$(node "${SCRIPT_DIR}/parseDatabaseUrl.mjs")" \
  || fail "DATABASE_URL 을 읽지 못했습니다."
eval "$DB_VARS"

STAMP="$(date +%Y%m%d-%H%M%S)"
DAY="${STAMP%%-*}"

# 서버 안에만 백업할 때는 S3 설정이 아예 없다. set -u 에 걸리지 않도록 그때는 만들지 않는다.
DEST=""
AWS_ARGS=()
if [ "$LOCAL_ONLY" = "0" ]; then
  DEST="s3://${S3_BUCKET}/${S3_PREFIX}"
  AWS_ARGS=(--endpoint-url "$S3_ENDPOINT" --region "$S3_REGION")
fi

if [ "$CHECK_ONLY" = "1" ]; then
  log "명령 확인 완료 ($REQUIRED_CMDS)"
  log "환경변수 확인 완료"
  if [ "$HAS_UPLOADS" = "1" ]; then
    log "사진 폴더: $UPLOAD_DIR"
  else
    log "사진 폴더가 아직 없습니다($UPLOAD_DIR). 올라온 사진이 없다는 뜻이며, 데이터베이스만 백업합니다."
  fi
  log "DB: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}"
  log "보관 기간: ${RETENTION_DAYS}일"
  if [ "$LOCAL_ONLY" = "1" ]; then
    log "저장 위치: ${BACKUP_LOCAL_DIR}/ (서버 안)"
    mkdir -p "${BACKUP_LOCAL_DIR}/db" \
      || fail "백업 폴더를 만들지 못했습니다: ${BACKUP_LOCAL_DIR}"
    [ -w "${BACKUP_LOCAL_DIR}/db" ] \
      || fail "백업 폴더에 쓸 수 없습니다: ${BACKUP_LOCAL_DIR}"
    log "백업 폴더 쓰기 정상. 준비가 끝났습니다. (--check 였으므로 백업하지 않았습니다)"
  else
    log "저장 위치: ${DEST}/"
    log "버킷 접근 확인 중..."
    aws "${AWS_ARGS[@]}" s3 ls "s3://${S3_BUCKET}/" >/dev/null \
      || fail "버킷에 접근하지 못했습니다. 키와 주소, 버킷 이름을 확인해 주세요."
    log "버킷 접근 정상. 준비가 끝났습니다. (--check 였으므로 아무것도 올리지 않았습니다)"
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# 2. 작업 폴더 준비 (끝나면 무조건 지운다)
# ---------------------------------------------------------------------------

WORK_DIR="$(mktemp -d "${BACKUP_TMP_DIR}/somang-backup-XXXXXX")"
chmod 700 "$WORK_DIR"
cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

# 비밀번호를 명령줄에 두면 서버의 다른 사용자가 ps 로 볼 수 있다.
# 권한 600 인 설정 파일로 넘긴다.
MYSQL_CNF="${WORK_DIR}/my.cnf"
umask 077
cat >"$MYSQL_CNF" <<EOF
[client]
host=${DB_HOST}
port=${DB_PORT}
user=${DB_USER}
password=${DB_PASS}
EOF

# ---------------------------------------------------------------------------
# 3. 데이터베이스 내보내기
# ---------------------------------------------------------------------------

DB_FILE="${WORK_DIR}/db-${STAMP}.sql.gz"
log "데이터베이스를 내보내는 중... (${DB_NAME})"

# --single-transaction: 서비스를 멈추지 않고도 시점이 일관된 사본을 만든다.
# --quick: 큰 표도 메모리에 다 올리지 않고 한 줄씩 내보낸다.
DUMP_ARGS=(--single-transaction --quick --routines --triggers)

# 아래 두 옵션은 MySQL 에만 있다. MariaDB 에서는 오류가 나므로 있을 때만 붙인다.
MYSQLDUMP_HELP="$(mysqldump --help 2>/dev/null || true)"
case "$MYSQLDUMP_HELP" in
  *set-gtid-purged*) DUMP_ARGS+=(--set-gtid-purged=OFF) ;;
esac
case "$MYSQLDUMP_HELP" in
  *no-tablespaces*) DUMP_ARGS+=(--no-tablespaces) ;;
esac

mysqldump --defaults-extra-file="$MYSQL_CNF" "${DUMP_ARGS[@]}" "$DB_NAME" \
  | gzip -9 >"$DB_FILE" \
  || fail "데이터베이스 내보내기에 실패했습니다."

# 내용이 비었는데 성공으로 처리되면 백업이 없는 것과 같다.
gzip -t "$DB_FILE" || fail "만들어진 데이터베이스 파일이 손상되었습니다."

# grep -q 는 첫 줄을 찾자마자 파이프를 닫아 gzip 이 SIGPIPE 로 죽는다.
# pipefail 이 켜져 있으면 정상 백업도 실패로 잡히므로, 끝까지 읽는 grep -c 를 쓴다.
TABLE_COUNT="$(gzip -dc "$DB_FILE" | grep -c '^CREATE TABLE' || true)"
if [ "${TABLE_COUNT:-0}" -lt 1 ]; then
  fail "데이터베이스 파일에 테이블이 없습니다. 백업을 올리지 않았습니다."
fi
log "표 ${TABLE_COUNT}개를 확인했습니다."
log "데이터베이스 내보내기 완료 ($(du -h "$DB_FILE" | cut -f1))"

# ---------------------------------------------------------------------------
# 4. 사진 묶기
# ---------------------------------------------------------------------------

UPLOADS_FILE="${WORK_DIR}/uploads-${STAMP}.tar.gz"
if [ "$HAS_UPLOADS" = "1" ]; then
  log "사진을 묶는 중... (${UPLOAD_DIR})"
  tar -czf "$UPLOADS_FILE" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")" \
    || fail "사진 묶기에 실패했습니다."
  tar -tzf "$UPLOADS_FILE" >/dev/null || fail "만들어진 사진 파일이 손상되었습니다."
  log "사진 묶기 완료 ($(du -h "$UPLOADS_FILE" | cut -f1))"
else
  log "사진 폴더가 없어 건너뜁니다 (${UPLOAD_DIR}). 올라온 사진이 아직 없습니다."
fi

# ---------------------------------------------------------------------------
# 5. 올리기
# ---------------------------------------------------------------------------

if [ "$LOCAL_ONLY" = "1" ]; then
  log "서버 안에 보관하는 중... (${BACKUP_LOCAL_DIR})"
  mkdir -p "${BACKUP_LOCAL_DIR}/db" "${BACKUP_LOCAL_DIR}/uploads" \
    || fail "백업 폴더를 만들지 못했습니다: ${BACKUP_LOCAL_DIR}"
  chmod 700 "$BACKUP_LOCAL_DIR" "${BACKUP_LOCAL_DIR}/db" "${BACKUP_LOCAL_DIR}/uploads"

  cp "$DB_FILE" "${BACKUP_LOCAL_DIR}/db/$(basename "$DB_FILE")" \
    || fail "데이터베이스 백업 파일을 옮기지 못했습니다."
  if [ "$HAS_UPLOADS" = "1" ]; then
    cp "$UPLOADS_FILE" "${BACKUP_LOCAL_DIR}/uploads/$(basename "$UPLOADS_FILE")" \
      || fail "사진 백업 파일을 옮기지 못했습니다."
  fi

  # 옮겨진 것이 실제로 있고 읽을 수 있는지 확인한다.
  gzip -t "${BACKUP_LOCAL_DIR}/db/$(basename "$DB_FILE")" \
    || fail "보관된 데이터베이스 파일을 확인하지 못했습니다."
  log "보관 완료"
else
  log "클라우드 저장소로 올리는 중..."
  aws "${AWS_ARGS[@]}" s3 cp "$DB_FILE" "${DEST}/db/$(basename "$DB_FILE")" \
    || fail "데이터베이스 파일 업로드에 실패했습니다."
  if [ "$HAS_UPLOADS" = "1" ]; then
    aws "${AWS_ARGS[@]}" s3 cp "$UPLOADS_FILE" "${DEST}/uploads/$(basename "$UPLOADS_FILE")" \
      || fail "사진 파일 업로드에 실패했습니다."
  fi

  # 올라간 것이 실제로 있는지 확인한다.
  aws "${AWS_ARGS[@]}" s3 ls "${DEST}/db/$(basename "$DB_FILE")" >/dev/null \
    || fail "업로드된 데이터베이스 파일을 확인하지 못했습니다."
  log "업로드 완료"
fi

# ---------------------------------------------------------------------------
# 6. 오래된 백업 정리
# ---------------------------------------------------------------------------

CUTOFF="$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null \
  || date -v-"${RETENTION_DAYS}"d +%Y%m%d)"
log "${CUTOFF} 이전 백업을 정리합니다 (${RETENTION_DAYS}일 보관)"

removed=0
for folder in db uploads; do
  if [ "$LOCAL_ONLY" = "1" ]; then
    [ -d "${BACKUP_LOCAL_DIR}/${folder}" ] || continue
    while read -r path; do
      [ -n "$path" ] || continue
      key="$(basename "$path")"
      # 파일 이름은 db-20260814-031500.sql.gz 형태다. 가운데 날짜를 꺼낸다.
      day="$(printf '%s' "$key" | sed -n 's/^[a-z]*-\([0-9]\{8\}\)-.*/\1/p')"
      [ -n "$day" ] || continue
      if [ "$day" -lt "$CUTOFF" ]; then
        rm -f "$path" && removed=$((removed + 1))
      fi
    done < <(find "${BACKUP_LOCAL_DIR}/${folder}" -maxdepth 1 -type f -name '*.gz')
  else
    while read -r key; do
      [ -n "$key" ] || continue
      # 파일 이름은 db-20260814-031500.sql.gz 형태다. 가운데 날짜를 꺼낸다.
      day="$(printf '%s' "$key" | sed -n 's/^[a-z]*-\([0-9]\{8\}\)-.*/\1/p')"
      [ -n "$day" ] || continue
      if [ "$day" -lt "$CUTOFF" ]; then
        aws "${AWS_ARGS[@]}" s3 rm "${DEST}/${folder}/${key}" >/dev/null \
          && removed=$((removed + 1))
      fi
    done < <(aws "${AWS_ARGS[@]}" s3 ls "${DEST}/${folder}/" | awk '{print $4}')
  fi
done
log "오래된 백업 ${removed}개를 지웠습니다."

log "오늘(${DAY}) 백업이 정상적으로 끝났습니다."
