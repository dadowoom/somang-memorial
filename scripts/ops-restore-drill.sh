#!/usr/bin/env bash
# 소망추모관 백업 복구 연습 (2026-09-23). 운영 DB·운영 사진은 읽기만 한다.
set -euo pipefail
D=/data/restore-drill-somang-$(date +%Y%m%d_%H%M%S)
C=somang-restore-drill
R=ncpcrypt-services:somang-memorial
cleanup() {
  docker rm -f "$C" >/dev/null 2>&1 || true
  rm -rf "$D"
}
trap cleanup EXIT
mkdir -m 700 "$D"; cd "$D"

DBF=$(rclone lsf "$R/db/" | sort | tail -1)
UPF=$(rclone lsf "$R/uploads/" | sort | tail -1)
echo "백업 파일: $DBF / $UPF"
rclone copyto "$R/db/$DBF" db.sql.gz
rclone copyto "$R/uploads/$UPF" uploads.tar.gz
gzip -t db.sql.gz && echo "DB 압축 정상 ($(du -h db.sql.gz | cut -f1))"
tar -tzf uploads.tar.gz >/dev/null && echo "사진 묶음 정상 ($(du -h uploads.tar.gz | cut -f1))"

# 임시 DB: 네트워크 없이(외부와 연결 안 됨), 메모리 1GB 제한, 끝나면 지움
docker run -d --name "$C" --network none --memory 1g \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -e MYSQL_DATABASE=restore_test \
  mysql:8.0.46 >/dev/null
for i in $(seq 1 60); do
  docker exec "$C" mysql -uroot -e "SELECT 1" >/dev/null 2>&1 && break
  sleep 2
done
gzip -dc db.sql.gz | docker exec -i "$C" mysql -uroot restore_test
echo "DB 되살리기 끝"

Q="SELECT 'tables', COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()
UNION ALL SELECT 'memorials', COUNT(*) FROM memorials
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'interment', COUNT(*) FROM somang_interment_records
UNION ALL SELECT 'gallery_photos', COUNT(*) FROM memorial_gallery_photos
UNION ALL SELECT 'family_room_photos', COUNT(*) FROM memorial_family_room_photos
UNION ALL SELECT 'letters', COUNT(*) FROM memorial_letters
UNION ALL SELECT 'reminders', COUNT(*) FROM memorial_reminder_subscriptions
UNION ALL SELECT 'audit_logs', COUNT(*) FROM admin_audit_logs"
docker exec "$C" mysql -uroot -N restore_test -e "$Q" > restored.txt

cd /var/www/somang-memorial/current
set -a; . ./.env; set +a
eval "$(node scripts/parseDatabaseUrl.mjs)"
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -N "$DB_NAME" -e "$Q" > "$D/prod.txt"
cd "$D"
echo "항목 / 백업에서 되살린 수 / 지금 운영 수"
join -t $'\t' <(sort restored.txt) <(sort prod.txt) | awk -F'\t' '{printf "  %-20s %8s %8s %s\n",$1,$2,$3,($2==$3?"같음":"다름")}'

# 사진: 묶음을 풀어 운영 폴더와 파일 목록·내용(해시)을 비교
mkdir up && tar -xzf uploads.tar.gz -C up
(cd up/uploads && find . -type f -not -path "./.trash/*" -exec sha256sum {} + | sort -k2) > up.sha
(cd /var/www/somang-memorial/uploads && find . -type f -not -path "./.trash/*" -exec sha256sum {} + | sort -k2) > live.sha
echo "사진: 백업 $(wc -l < up.sha)개 / 운영 $(wc -l < live.sha)개"
echo "  백업에만 있는 파일: $(comm -23 <(cut -c67- up.sha) <(cut -c67- live.sha) | wc -l)"
echo "  운영에만 있는 파일: $(comm -13 <(cut -c67- up.sha) <(cut -c67- live.sha) | wc -l)"
echo "  이름은 같은데 내용이 다른 파일: $(join -1 2 -2 2 <(sort -k2 up.sha) <(sort -k2 live.sha) | awk '$2!=$3' | wc -l)"
echo "연습 끝. 임시 DB와 내려받은 파일은 지웁니다."
