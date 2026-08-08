#!/usr/bin/env bash
# DB 덤프 파일 생성 스크립트 (포팅 매뉴얼 3번 "DB 덤프 파일 최신본" 제출용)
#
# mysql 컨테이너 안에서 mysqldump를 실행해 호스트로 받아온다.
# 컨테이너 자체에 이미 MYSQL_ROOT_PASSWORD / MYSQL_DATABASE 환경변수가
# 들어있으므로(docker-compose.yml) 비밀번호를 따로 입력하거나 .env를
# 다시 파싱할 필요가 없다.
#
# 사용법:
#   deploy/db/dump.sh                        # 로컬  (docker-compose.yml + override.yml, ./.env)
#   deploy/db/dump.sh --prod                 # 운영  (docker-compose.yml + prod.yml, /opt/ssabway/.env)
#   deploy/db/dump.sh --prod --env-file <경로>   # 운영 .env 위치가 다를 때 직접 지정
#   deploy/db/dump.sh -o out.sql             # 출력 파일 경로 지정
#
# ⚠️ 운영 서버(EC2)에서는 .env가 레포 안(APP_DIR)이 아니라 /opt/ssabway/.env에 있다
#    (Jenkinsfile의 DC 별칭 참고). --prod의 기본값도 이를 따른다.

set -euo pipefail

cd "$(dirname "$0")/../.."

compose_files=(-f docker-compose.yml)
out=""
env_file=""
prod=""

while [ $# -gt 0 ]; do
    case "$1" in
        --prod)
            compose_files+=(-f docker-compose.prod.yml)
            prod=1
            shift
            ;;
        --env-file)
            env_file="$2"
            shift 2
            ;;
        -o|--output)
            out="$2"
            shift 2
            ;;
        *)
            echo "알 수 없는 옵션: $1" >&2
            exit 1
            ;;
    esac
done

if [ -z "$env_file" ]; then
    env_file=".env"
    [ -n "$prod" ] && env_file="/opt/ssabway/.env"
fi
if [ ! -f "$env_file" ]; then
    echo "env 파일을 찾을 수 없습니다: $env_file (--env-file 로 직접 지정하세요)" >&2
    exit 1
fi

if [ -z "$out" ]; then
    out="deploy/db/dumps/ssabway_dump_$(date +%Y%m%d_%H%M%S).sql"
fi
mkdir -p "$(dirname "$out")"

dc=(docker compose "${compose_files[@]}" --env-file "$env_file")

echo "덤프 생성 중 -> $out"
"${dc[@]}" exec -T mysql sh -c \
    'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
        --single-transaction --routines --triggers --events \
        --default-character-set=utf8mb4 \
        "$MYSQL_DATABASE"' > "$out"

echo "완료: $out ($(du -h "$out" | cut -f1))"
