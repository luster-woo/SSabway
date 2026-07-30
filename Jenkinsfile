// SSabway 배포 파이프라인 (main 브랜치 → 서버 자동 배포)
// 레포 루트에 Jenkinsfile 이라는 이름으로 둡니다.

pipeline {
    agent any

    options {
        // 동시 빌드 금지 — 메모리가 15Gi뿐이라 빌드가 겹치면 OOM 위험
        disableConcurrentBuilds()
        timeout(time: 40, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        booleanParam(
            name: 'DEPLOY_ALL',
            defaultValue: false,
            description: '변경 감지를 무시하고 세 서비스를 모두 재배포'
        )
    }

    triggers {
        // 2분마다 main 브랜치 변경 확인 (웹훅 붙이기 전 임시 방식)
        pollSCM('H/2 * * * *')
    }

    environment {
        APP_DIR     = '/home/ubuntu/app'
        DOMAIN      = 'i15d104.p.ssafy.io'   // ← 실제 도메인 확인 후 수정
        MIN_FREE_MB = '2500'

        // 서버에서 쓰는 dcp 별칭과 동일한 조합
        DC = 'docker compose -f /home/ubuntu/app/docker-compose.yml -f /home/ubuntu/app/docker-compose.prod.yml --env-file /opt/ssabway/.env'
    }

    stages {

        stage('메모리 확인') {
            steps {
                sh '''#!/bin/bash
                set -e
                free -m
                AVAIL=$(free -m | awk '/^Mem:/ {print $7}')
                echo "가용 메모리 ${AVAIL}MB / 최소 요구 ${MIN_FREE_MB}MB"
                if [ "$AVAIL" -lt "$MIN_FREE_MB" ]; then
                    echo "메모리 부족. 빌드를 시작하지 않습니다."
                    echo "빌드 도중 OOM이 나면 mysql이 죽을 수 있어 미리 막는 안전장치입니다."
                    exit 1
                fi
                '''
            }
        }

        stage('소스 업데이트') {
            steps {
                sh '''#!/bin/bash
                set -e
                cd "$APP_DIR"
                git rev-parse HEAD > /tmp/ssabway_before

                git fetch origin main
                # --ff-only: 서버에서 손으로 고친 파일이 있으면 조용히 덮어쓰지 않고 실패시킴
                git merge --ff-only origin/main

                git rev-parse HEAD > /tmp/ssabway_after
                echo "이전 커밋: $(cat /tmp/ssabway_before)"
                echo "현재 커밋: $(cat /tmp/ssabway_after)"
                '''
            }
        }

        stage('변경 감지') {
            steps {
                script {
                    def before = readFile('/tmp/ssabway_before').trim()
                    def after  = readFile('/tmp/ssabway_after').trim()

                    def changed
                    if (params.DEPLOY_ALL) {
                        echo 'DEPLOY_ALL — 전체 재배포'
                        changed = 'ALL'
                    } else if (before == after) {
                        echo '새 커밋 없음 — 전체 재배포로 처리'
                        changed = 'ALL'
                    } else {
                        changed = sh(
                            script: "git -C ${env.APP_DIR} diff --name-only ${before} ${after}",
                            returnStdout: true
                        ).trim()
                        echo "변경된 파일:\n${changed}"
                    }

                    def all = (changed == 'ALL')
                    env.BUILD_API      = (all || changed.contains('backend/ssabway/')).toString()
                    env.BUILD_SIGNAL   = (all || changed.contains('backend/ssabway_webrtc/')).toString()
                    env.BUILD_FRONTEND = (all || changed.contains('frontend/')).toString()
                    env.TOUCH_NGINX    = (all || changed.contains('deploy/nginx.conf')).toString()

                    echo "api=${env.BUILD_API} signaling=${env.BUILD_SIGNAL} frontend=${env.BUILD_FRONTEND} nginx설정=${env.TOUCH_NGINX}"

                    if (env.BUILD_API == 'false' && env.BUILD_SIGNAL == 'false'
                        && env.BUILD_FRONTEND == 'false' && env.TOUCH_NGINX == 'false') {
                        currentBuild.result = 'SUCCESS'
                        currentBuild.description = '배포 대상 없음'
                        error('배포할 변경사항이 없습니다.')
                    }
                }
            }
        }

        // 메모리 때문에 반드시 한 번에 하나씩 빌드합니다
        stage('api 배포') {
            when { environment name: 'BUILD_API', value: 'true' }
            steps {
                sh 'cd "$APP_DIR" && $DC up -d --build api'
            }
        }

        stage('signaling 배포') {
            when { environment name: 'BUILD_SIGNAL', value: 'true' }
            steps {
                sh 'cd "$APP_DIR" && $DC up -d --build signaling'
            }
        }

        stage('frontend 배포') {
            when { environment name: 'BUILD_FRONTEND', value: 'true' }
            steps {
                sh 'cd "$APP_DIR" && $DC up -d --build frontend'
            }
        }

        stage('nginx 재시작') {
            steps {
                // nginx.conf는 볼륨 마운트라 --build가 아니라 restart.
                // 또한 컨테이너가 재생성되면 IP가 바뀌는데 nginx가 옛 IP를 캐시해
                // 502가 나므로, 업스트림을 다시 배포했으면 항상 restart.
                sh 'cd "$APP_DIR" && $DC exec -T nginx nginx -t && $DC restart nginx'
            }
        }

        stage('검증') {
            steps {
                sh '''#!/bin/bash
                set -e
                cd "$APP_DIR"

                echo "--- 컨테이너 상태 ---"
                $DC ps

                echo "--- 비정상 서비스 확인 ---"
                BAD=$($DC ps --format '{{.Service}} {{.State}}' | grep -v ' running' || true)
                if [ -n "$BAD" ]; then
                    echo "정상 실행 중이 아닌 서비스가 있습니다:"
                    echo "$BAD"
                    exit 1
                fi

                echo "--- 외부 HTTPS 응답 ---"
                sleep 10
                CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://${DOMAIN}/")
                echo "GET / → ${CODE}"
                case "$CODE" in
                    2*|3*) echo "프론트 정상" ;;
                    *) echo "프론트 응답 이상"; exit 1 ;;
                esac
                '''
            }
        }

        stage('정리') {
            steps {
                // dangling(태그 없는) 이미지만 삭제 — 실행 중 컨테이너에는 영향 없음
                sh 'docker image prune -f'
            }
        }
    }

    post {
        failure {
            sh '''#!/bin/bash
            cd "$APP_DIR" || exit 0
            echo "===== 실패 직전 로그 ====="
            $DC logs --since 5m --tail 80 api        || true
            $DC logs --since 5m --tail 40 signaling  || true
            $DC logs --since 5m --tail 40 nginx      || true
            echo "===== 되돌리기 ====="
            echo "cd ~/app && git checkout \\$(cat ~/last-good.txt) && dcp up -d --build api"
            '''
        }
        success {
            sh 'cd "$APP_DIR" && git rev-parse --short HEAD > /home/ubuntu/last-good.txt'
            echo '배포 성공 — last-good.txt 갱신'
        }
    }
}
