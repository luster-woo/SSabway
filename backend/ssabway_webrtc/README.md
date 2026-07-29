# SSABWAY WebRTC Signaling Server

Java 21과 Spring Boot 기반의 1:1 화상 상담용 WebRTC 시그널링 서버입니다.

## 설정 파일

`application.yaml`이 `application-secret.yaml`을 불러옵니다.

프로젝트를 처음 받은 팀원은 아래 파일을 복사합니다.

```text
src/main/resources/application-secret.example.yaml
→ src/main/resources/application-secret.yaml
```

복사한 파일에서 `**` 부분만 본인의 MySQL 설정으로 변경합니다.

```yaml
database:
  name: "**"
  password: "**"
```

`application-secret.yaml`은 민감정보를 포함하므로 Git에 커밋하지 않습니다.

## 현재 구조

```text
src/main/java/com/ssafy/ssabway_webrtc
├─ common
│  └─ response
└─ domain
```

WebRTC 기능은 다음 구조로 추가하는 것을 권장합니다.

```text
domain/webrtc
├─ config       # WebSocket 설정
├─ handler      # 시그널링 메시지 처리
├─ dto          # JOIN, OFFER, ANSWER, ICE, LEAVE 메시지
├─ model        # 메모리 기반 Room, Participant
├─ service      # 입장, 퇴장, 메시지 전달 로직
└─ store        # 방과 WebSocket 세션 보관
```

WebRTC의 Room과 Participant는 JPA Entity가 아닌 일반 Java 객체로 관리합니다.
상담 이력처럼 영구 보관할 데이터만 별도 백엔드에서 JPA Entity로 관리합니다.

## 실행

Windows:

```shell
gradlew.bat bootRun
```

테스트:

```shell
gradlew.bat test
```
