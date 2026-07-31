/**
 * Google Identity Services(GIS) 전역 타입.
 *
 * GIS 는 npm 패키지가 아니라 accounts.google.com 에서 내려오는 스크립트라
 * 타입이 함께 오지 않는다. 우리가 실제로 쓰는 API 만 선언한다.
 *
 * 이 파일은 top-level import/export 가 없어야 전역 선언으로 동작한다.
 * (하나라도 넣으면 모듈이 되어 window.google 이 인식되지 않는다)
 */

/** 로그인 성공 시 콜백으로 들어오는 값 */
interface GoogleCredentialResponse {
  /** 구글이 서명한 ID Token(JWT). 이 값을 서버로 보낸다. */
  credential: string
  /** 어떤 방식으로 선택됐는지 (btn, user, auto 등) */
  select_by: string
}

interface GoogleIdConfiguration {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  /** 팝업 바깥을 눌러 닫을 수 있게 할지 */
  cancel_on_tap_outside?: boolean
  /** One Tap 을 쓸 때 필요. 1차 범위에서는 쓰지 않는다. */
  use_fedcm_for_prompt?: boolean
}

/**
 * 버튼 모양 옵션.
 *
 * GIS 가 iframe 으로 버튼을 그리기 때문에 CSS 로는 손댈 수 없고
 * 이 옵션들로만 조절한다. width 는 최대 400 이다.
 */
interface GoogleButtonOptions {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  width?: number
  /** 버튼 문구의 언어. i18n 현재 언어를 넘기면 함께 바뀐다. */
  locale?: string
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
  /** 자동 선택 해제. 로그아웃 시 호출해야 다음 로그인에서 계정을 다시 고른다. */
  disableAutoSelect: () => void
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId
    }
  }
}
