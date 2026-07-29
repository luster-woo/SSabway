import { create } from 'zustand'

/**
 * 도움 요청(챗봇형) 화면의 대화 진행 상태.
 *
 * '역무원과 화상 연결'을 눌렀는지를 기억한다. 로그인 화면에 다녀오면
 * 컴포넌트가 리마운트되므로, 로컬 state로는 "로그인 후 화상 연결 버튼 활성화"
 * 흐름을 이어갈 수 없어 스토어에 둔다. (메모리에만 보관)
 */
interface HelpChatState {
  /** '역무원과 화상 연결'을 눌렀는지 */
  hasRequestedConnection: boolean
  requestConnection: () => void
  /** 대화를 처음 상태로 되돌린다. 화면을 떠날 때 호출한다. */
  resetConversation: () => void
}

export const useHelpChatStore = create<HelpChatState>((set) => ({
  hasRequestedConnection: false,
  requestConnection: () => set({ hasRequestedConnection: true }),
  resetConversation: () => set({ hasRequestedConnection: false }),
}))
