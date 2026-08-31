# 백업과 복구

매일 **데이터베이스**와 **업로드된 사진**을 외부 클라우드 저장소에 보관한다.
코드는 GitHub에 있으므로 백업하지 않는다.

실행 주체는 **Codex**(서버 작업 담당)다.

> 이 문서에는 실제 키·비밀번호·서버 주소를 적지 않는다. 공개 저장소다.

---

## 1. 무엇을 백업하나

| 대상 | 내용 | 저장 이름 |
|---|---|---|
| 데이터베이스 | 추모관, 가족관, 안장 기록, 계정 등 전부 | `db/db-날짜-시각.sql.gz` |
| 업로드 사진 | `UPLOAD_DIR`(기본 `/var/www/somang-memorial/uploads`) 전체 | `uploads/uploads-날짜-시각.tar.gz` |

기본 **30일** 보관하고 그보다 오래된 것은 자동으로 지운다(`RETENTION_DAYS`로 조정).

## 1-2. 클라우드 계정이 아직 없다면 — 서버 안 백업 (임시)

외부 저장소 계정이 준비되기 전에도 **서버 안에만** 백업해 둘 수 있다.

```bash
./scripts/backup.sh --local-only --check   # 준비 상태만 확인
./scripts/backup.sh --local-only           # 실행
```

- 저장 위치: `BACKUP_LOCAL_DIR`(기본 `/var/www/somang-memorial/backups/daily`)
- 필요한 환경변수는 `DATABASE_URL` **하나뿐**이다. S3 키도 `aws` 명령도 필요 없다.
- 파일 이름과 보관 기간 규칙은 클라우드 백업과 같다.

> ⚠️ **서버가 통째로 사라지는 사고는 막지 못한다.** 디스크 고장, 서버 삭제,
> 랜섬웨어에는 무력하다. 데이터베이스가 깨지거나 자료를 실수로 지웠을 때를 위한
> **임시 방편**이다. 계정이 준비되면 곧바로 클라우드 백업으로 바꿀 것.

아직 아무도 사진을 올리지 않았으면 사진 폴더 자체가 없다. 그때는 사진 묶기를
건너뛰고 데이터베이스만 백업한다(백업이 실패하지 않는다).

## 1-3. rclone 으로 올리기 (이 서버에서 쓰는 방식)

이 서버에는 `aws` 명령이 없고 대신 **rclone** 이 깔려 있으며, 네이버 클라우드 접속이
이미 등록되어 있다(`rclone listremotes` 로 확인). 새로 설치할 것 없이 그대로 쓴다.

```bash
RCLONE_REMOTE=ncp:somang-memorial-backup ./scripts/backup.sh --check
RCLONE_REMOTE=ncp:somang-memorial-backup ./scripts/backup.sh
```

- `RCLONE_REMOTE` 가 설정되어 있으면 `aws` 대신 rclone 으로 올린다.
- 실제 저장 위치는 `RCLONE_REMOTE` 아래 `S3_PREFIX`(기본 `somang-memorial`) 폴더다.
  예: `ncp:somang-memorial-backup/somang-memorial/db/db-날짜-시각.sql.gz`
- 접속 키는 rclone 설정에 들어 있으므로 이 저장소나 `.env` 에 넣지 않는다.
- 보관 기간 정리, 파일 이름 규칙은 다른 방식과 같다.

버킷은 **공개하지 않은 상태**여야 한다. 유가족 사진과 개인정보가 들어간다.

## 2. 저장소 준비

Cloudflare R2와 네이버 클라우드 오브젝트 스토리지는 **둘 다 S3 방식**이라
같은 스크립트가 그대로 동작한다. 주소와 지역 값만 다르다.

| | Cloudflare R2 | 네이버 클라우드 |
|---|---|---|
| `S3_ENDPOINT` | `https://<계정ID>.r2.cloudflarestorage.com` | `https://kr.object.ncloudstorage.com` |
| `S3_REGION` | `auto` (기본값) | `kr-standard` |

준비할 것:

1. 버킷을 하나 만든다. **공개 접근은 반드시 꺼 둔다.**
2. 이 버킷에만 쓸 수 있는 액세스 키를 발급한다. (계정 전체 권한 키를 쓰지 않는다.)
3. 서버와 **다른 곳**에 두는 것이 목적이다. 서버 안이나 같은 업체의 같은 장비에 두면 의미가 없다.

## 3. 서버 설정

키는 **저장소에 넣지 않는다.** 서버의 환경변수 파일에만 둔다.

```bash
DATABASE_URL=mysql://사용자:비밀번호@주소:3306/DB이름
S3_BUCKET=버킷이름
S3_ENDPOINT=https://...
S3_REGION=auto            # 네이버는 kr-standard
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

환경변수 파일은 권한을 좁힌다.

```bash
chmod 600 /etc/somang-memorial/backup.env
```

필요한 명령: `node`, `mysqldump`, `tar`, `aws` (AWS CLI v2).

데이터베이스 사용자는 **읽기 권한만** 있으면 된다 (`SELECT`, `SHOW VIEW`, `TRIGGER`).
`--single-transaction`으로 내보내므로 서비스를 멈출 필요가 없고 `LOCK TABLES` 권한도 필요 없다.

## 4. 먼저 확인만 해보기

아무것도 올리지 않고 준비 상태만 점검한다. **처음 설정했을 때 반드시 이것부터 실행한다.**

```bash
set -a && . /etc/somang-memorial/backup.env && set +a && ./scripts/backup.sh --check
```

명령·환경변수·사진 폴더·버킷 접근이 모두 정상이면 "준비가 끝났습니다"가 나온다.

## 5. 매일 자동 실행

방문이 적은 새벽에 하루 한 번 실행한다. `crontab -e`:

```
15 3 * * * set -a; . /etc/somang-memorial/backup.env; set +a; /var/www/somang-memorial/scripts/backup.sh >> /var/log/somang-backup.log 2>&1
```

실패하면 종료 코드가 0이 아니고 로그 마지막 줄에 `[backup] 실패:` 가 남는다.
**로그를 아무도 보지 않으면 백업이 몇 달째 실패해도 모른다.** 주기적으로 확인한다.

```bash
tail -20 /var/log/somang-backup.log
```

## 6. 복구 방법

> ⚠️ 복구는 **기존 데이터를 덮어쓴다.** 실행 전 반드시 관리자 확인을 받고,
> 지금 상태의 백업을 먼저 한 번 더 만든다.

### 6-1. 백업 목록 보기

```bash
aws --endpoint-url "$S3_ENDPOINT" --region "$S3_REGION" s3 ls "s3://$S3_BUCKET/somang-memorial/db/"
```

### 6-2. 내려받기

```bash
aws --endpoint-url "$S3_ENDPOINT" --region "$S3_REGION" \
  s3 cp "s3://$S3_BUCKET/somang-memorial/db/db-20260814-031500.sql.gz" /var/tmp/
```

### 6-3. 데이터베이스 되돌리기

먼저 파일이 멀쩡한지 확인한다.

```bash
gzip -t /var/tmp/db-20260814-031500.sql.gz && gzip -dc /var/tmp/db-20260814-031500.sql.gz | grep -c '^CREATE TABLE'
```

**연습이나 확인이 목적이면 반드시 다른 이름의 DB에 넣어 본다.** 운영 DB에 바로 넣지 않는다.

```bash
mysql -e "CREATE DATABASE somang_restore_test"
gzip -dc /var/tmp/db-20260814-031500.sql.gz | mysql somang_restore_test
```

정말로 운영 DB를 되돌려야 할 때만:

```bash
# 1) 지금 상태를 먼저 따로 보관한다
mysqldump --single-transaction 운영DB이름 | gzip > /var/tmp/before-restore-$(date +%Y%m%d-%H%M%S).sql.gz
# 2) 서비스를 잠시 멈춘다
# 3) 넣는다
gzip -dc /var/tmp/db-20260814-031500.sql.gz | mysql 운영DB이름
# 4) 서비스를 다시 켜고 /healthz, /readyz, 화면을 확인한다
```

### 6-4. 사진 되돌리기

```bash
aws --endpoint-url "$S3_ENDPOINT" --region "$S3_REGION" \
  s3 cp "s3://$S3_BUCKET/somang-memorial/uploads/uploads-20260814-031500.tar.gz" /var/tmp/

tar -tzf /var/tmp/uploads-20260814-031500.tar.gz | head    # 내용 먼저 확인
```

묶음 안에는 `uploads/` 폴더가 통째로 들어 있다. 기존 폴더를 지우지 말고
**옆에 풀어서 확인한 뒤** 바꿔치기한다.

```bash
mkdir -p /var/tmp/restore && tar -xzf /var/tmp/uploads-20260814-031500.tar.gz -C /var/tmp/restore
# 확인 후 교체
mv /var/www/somang-memorial/uploads /var/www/somang-memorial/uploads.old
mv /var/tmp/restore/uploads /var/www/somang-memorial/uploads
```

문제가 없으면 나중에 `uploads.old`를 지운다. **바로 지우지 않는다.**

## 7. 반드시 지킬 습관

- **한 달에 한 번은 실제로 복구해 본다.** (6-3의 `somang_restore_test` 방식)
  한 번도 복구해 보지 않은 백업은 백업이라고 할 수 없다.
- 백업 로그를 주기적으로 확인한다.
- 저장소 용량과 요금을 가끔 확인한다.

## 8. 알아둘 점

- 백업 파일은 **암호화하지 않고** 올린다. 버킷을 비공개로 두고 키를 잘 관리하는 것이 전제다.
  더 강한 보호가 필요하면 암호화를 추가할 수 있으나, **암호를 잃어버리면 백업 전체를 못 쓴다.**
  도입한다면 암호 보관 방법을 먼저 정한다.
- 원본 소천자 엑셀에는 전화번호가 들어 있지만 **데이터베이스에는 저장되지 않는다.**
  엑셀 파일 자체를 따로 안전하게 보관한다.
