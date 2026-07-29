import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * 진입한 화면으로 되돌아간다.
 *
 * 목적지를 고정하지 않고 히스토리를 한 칸 되돌리므로, 시작 페이지에서 왔으면
 * 시작 페이지로, 챗봇 위젯에서 왔으면 위젯으로 돌아간다.
 * 화면이 늘어나도 이 함수를 고칠 필요가 없다.
 *
 * location.key 가 'default' 면 이 화면이 첫 진입(새로고침·주소 직접 입력)이라
 * 되돌아갈 히스토리가 없다. 그대로 navigate(-1) 하면 브라우저가 앱 밖으로
 * 나가버리므로 그때만 시작 페이지로 보낸다.
 */
export function useGoBack(): () => void {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    if (location.key === 'default') {
      void navigate('/', { replace: true })
      return
    }
    void navigate(-1)
  }, [navigate, location.key])
}
