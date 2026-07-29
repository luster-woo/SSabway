import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState 초기화 함수로 감싸야 재렌더 시 캐시가 날아가지 않는다
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            // 모바일에서 앱 전환이 잦아 과도한 재요청을 막는다.
            // 폴링이 필요한 쿼리는 개별로 refetchInterval 을 지정한다.
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
