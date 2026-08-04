/**
 * 비밀번호 규칙. BE 검증과 같은 값이어야 한다.
 *
 * ssabway 의 SignUpRequest / PasswordResetRequest 둘 다 같은 제약을 건다.
 *   @Size(min = 8, max = 64)
 *   @Pattern(regexp = "^\\S+$", message = "비밀번호에 공백을 포함할 수 없습니다")
 *
 * 최종 판정은 서버가 하지만 화면에서 먼저 걸러야 하는 이유가 셋 있다.
 *   1) 위반하면 BE 는 400 INVALID_INPUT_VALUE 만 줄 뿐 어느 규칙인지 알려주지
 *      않는다. 사용자는 무엇을 고쳐야 하는지 알 수 없다.
 *   2) 회원가입에서 그 400 을 한 번 받으려면 이메일 인증 유효시간(30분)을
 *      소모한다. 형식 오류로 인증을 다시 받게 만들 이유가 없다.
 *   3) 공백 금지는 화면 어디에도 안내가 없다. placeholder 도 "8자 이상"만
 *      말하고 있어서, 공백이 섞인 비밀번호를 넣은 사용자는 원인을 영영 모른다.
 *
 * ⚠️ BE 의 @Size/@Pattern 이 바뀌면 이 파일도 같이 바꿔야 한다. 두 곳에 규칙이
 *    있는 것은 감수한 중복이다 — 서버만 알고 있으면 위 세 문제가 그대로 남는다.
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 64

/**
 * 규칙 위반 종류. 값이 곧 i18n 키의 마지막 조각이다.
 * (`auth.signUp.error.passwordTooShort` / `auth.passwordReset.error.passwordTooShort`)
 *
 * 회원가입과 비밀번호 재설정이 화면 문구를 따로 쓰기 때문에 접두사는 화면이 넘긴다.
 */
export const PASSWORD_ISSUE = {
  TOO_SHORT: 'passwordTooShort',
  TOO_LONG: 'passwordTooLong',
  HAS_WHITESPACE: 'passwordHasSpace',
} as const

export type PasswordIssue = (typeof PASSWORD_ISSUE)[keyof typeof PASSWORD_ISSUE]

/**
 * 위반을 하나만 돌려준다. 문제가 없으면 null.
 *
 * 공백을 먼저 보는 이유: 공백이 섞이면 길이도 같이 어긋나는 경우가 많은데,
 * "8자 이상"이라고 안내하면 사용자는 공백을 더 넣어 길이를 채우려 한다.
 *
 * 빈 문자열은 null 이다. 아직 입력하지 않은 칸에 오류를 띄우지 않기 위함이고,
 * 제출 가능 여부는 호출한 쪽이 `password !== ''` 로 따로 본다.
 * (두 칸 일치 검사가 확인란이 비었을 때 불일치로 보지 않는 것과 같은 기준)
 */
export function findPasswordIssue(password: string): PasswordIssue | null {
  if (password === '') return null
  if (/\s/.test(password)) return PASSWORD_ISSUE.HAS_WHITESPACE
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_ISSUE.TOO_SHORT
  if (password.length > PASSWORD_MAX_LENGTH) return PASSWORD_ISSUE.TOO_LONG
  return null
}
