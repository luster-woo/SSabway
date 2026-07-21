# 커밋 컨벤션

## 형식
`<gitmoji> <type>(<scope>): <subject>`

예) ✨ feat(fe): 로그인 페이지 UI 구현
예) 🐛 fix(be): WebSocket 세션 종료 시 NPE 수정

## Type & Gitmoji 매핑
| Type     | Gitmoji | 설명                                    |
|----------|---------|-----------------------------------------|
| feat     | ✨      | 새로운 기능                              |
| fix      | 🐛      | 버그 수정                                |
| refactor | ♻️      | 리팩토링 (기능 변화 없음)                |
| style    | 🎨      | 코드 포맷팅, 세미콜론 등 (동작 변화 없음)|
| docs     | 📝      | 문서 수정                                |
| test     | ✅      | 테스트 코드                              |
| chore    | 🔧      | 빌드, 설정, 패키지 매니저 수정           |
| hotfix   | 🚑      | 긴급 수정                                |

## Scope (선택)
- fe / be / infra / docs

## 규칙
- gitmoji는 맨 앞에 하나만, 뒤에 공백 한 칸
- subject는 50자 이내, 마침표 없이
- 본문이 필요하면 한 줄 띄우고 "무엇을, 왜" 위주로 작성
- 이슈 연결 시 푸터에: Closes #12  (Jira 사용 시: WSP-12)