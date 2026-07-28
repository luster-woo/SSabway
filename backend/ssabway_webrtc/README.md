# SSABWAY WebRTC Backend

Java 21과 Spring Boot 기반의 SSABWAY 백엔드입니다. 관리자 기능은
`/api/admin` 아래에서 제공합니다.

## 1. 시작하기

### 필요한 프로그램

- JDK 21
- MySQL 8.x
- IntelliJ IDEA 권장

### 데이터베이스

```sql
CREATE DATABASE ssabway
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'ssafy'@'localhost' IDENTIFIED BY 'ssafy';
GRANT ALL PRIVILEGES ON ssabway.* TO 'ssafy'@'localhost';
```

DB 이름과 비밀번호는 `application-secret.yaml`에 들어 있습니다. 이 파일은
`application.yaml`의 `spring.config.import`로 불러오며 민감정보를 포함하므로
Git에 커밋하지 않습니다.

처음 프로젝트를 받은 팀원은
`application-secret.example.yaml`을 `application-secret.yaml`로 복사한 뒤
`**` 부분만 본인의 MySQL 설정으로 변경합니다.

```yaml
database:
  name: "본인의 DB 이름"
  password: "본인의 DB 비밀번호"
```

MySQL 주소는 `localhost:3306`, 사용자명은 `ssafy`로 공통 설정되어 있습니다.

설정 파일은 실행 환경별로 분리되어 있습니다.

| 파일 | 용도 |
|---|---|
| `application.yaml` | 애플리케이션명, SQL/JPA 공통 설정과 비밀 설정 import |
| `application-secret.yaml` | 개인 DB 이름과 비밀번호, Git 제외 |
| `application-secret.example.yaml` | 팀원에게 공유되는 비밀 설정 양식 |
| `src/test/resources/application.yaml` | 테스트 전용 인메모리 H2 |

새 환경에서는 예제 파일을 복사하고 DB 이름과 비밀번호만 입력해야 합니다.

> `schema.sql`은 애플리케이션 실행 시 항상 적용됩니다. SQL 문법이나 인코딩이
> 손상되어 있으면 서버 시작이 실패하므로 변경 후 반드시 로컬 실행으로 확인하세요.

### 실행

Windows:

```shell
gradlew.bat bootRun
```

macOS/Linux:

```shell
./gradlew bootRun
```

테스트:

```shell
gradlew.bat test
```

## 2. 폴더 구조

```text
src/main/java/com/ssafy/ssabway_webrtc
├─ common
│  ├─ config          # CORS, Security, JPA 등 공통 설정
│  ├─ exception       # 공통 예외와 전역 예외 처리
│  └─ response        # 공통 API 응답 형식
└─ domain
   ├─ admin
   │  ├─ controller   # 관리자 HTTP API
   │  ├─ dto          # 관리자 요청/응답 객체
   │  └─ service      # 관리자 화면용 집계/업무 로직
   ├─ consultation    # 상담
   ├─ navigation      # 역·포인트·경로
   ├─ staff           # 역무원/관리자 계정
   └─ user            # 사용자
```

도메인마다 필요할 때 `entity`, `repository`, `service`, `controller`, `dto`
폴더를 추가합니다. 화면 이름별로 패키지를 늘리기보다 업무 도메인을 기준으로
나누고, 관리자 전용 집계처럼 여러 도메인을 조합하는 기능만 `admin`에 둡니다.

## 3. 관리자 페이지 API 가이드

현재 준비된 첫 API:

```http
GET /api/admin/dashboard
```

응답 예시:

```json
{
  "success": true,
  "data": {
    "waitingConsultations": 0,
    "activeConsultations": 0,
    "registeredUsers": 0,
    "generatedAt": "2026-07-28T10:00:00"
  },
  "message": null
}
```

현재 수치는 화면 연동을 위한 초기값입니다. 각 도메인의 Entity와 Repository가
구현되면 `AdminDashboardService`에서 실제 집계 값으로 교체합니다.

권장 관리자 메뉴와 API:

| 메뉴 | API 예시 | 역할 |
|---|---|---|
| 대시보드 | `GET /api/admin/dashboard` | 대기/진행 상담과 사용자 현황 |
| 상담 관리 | `GET /api/admin/consultations` | 상담 목록, 상태 필터 |
| 사용자 관리 | `GET /api/admin/users` | 사용자 조회와 상세 확인 |
| 블랙리스트 | `GET/POST /api/admin/blacklists` | 등록과 해제 |
| 역/경로 관리 | `GET/POST /api/admin/stations` | 역, 포인트, 경로 데이터 관리 |
| 역무원 관리 | `GET/POST /api/admin/staffs` | 계정과 담당 역 관리 |

### 구현 순서

1. 손상된 `schema.sql` 복구 또는 Flyway 마이그레이션 도입
2. 테이블별 Entity와 Repository 구현
3. 관리자 로그인과 Spring Security 권한(`ROLE_ADMIN`) 적용
4. 목록 API에 페이지네이션, 검색, 정렬 추가
5. 대시보드 집계 쿼리 연결
6. 프런트 관리자 화면에서 `/api/admin/**` 연동

### 작성 규칙

- Controller는 입력 검증과 응답 변환만 담당합니다.
- Service에 업무 규칙과 트랜잭션을 둡니다.
- Entity를 API 응답으로 직접 반환하지 않고 DTO를 사용합니다.
- 목록 API는 처음부터 페이지네이션을 적용합니다.
- 삭제는 데이터 성격에 따라 소프트 삭제를 우선 검토합니다.
- 관리자 API에는 인증/인가 적용 전 운영 데이터를 연결하지 않습니다.
