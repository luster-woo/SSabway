import type { ReactNode } from 'react'
import { QueryProvider } from './QueryProvider'
import { Devtools } from './Devtools'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Devtools />
    </QueryProvider>
  )
}
