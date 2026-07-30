import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppLogo, Card } from '@/shared/ui'
import { useAdminLogin } from '@/admin/features/auth/useAdminLogin'
import { AdminButton } from '@/admin/ui/AdminButton'
import { AdminShell } from '@/admin/ui/AdminShell'
import { TextField } from '@/admin/ui/TextField'

/** 관리자 1. 로그인 — /admin/login */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [staffCode, setStaffCode] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const { login, isPending, errorMessage } = useAdminLogin()

  const isSubmittable =
    staffCode.trim() !== '' && staffPassword !== '' && !isPending

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSubmittable) return

    const isLoggedIn = await login({
      staffCode: staffCode.trim(),
      staffPassword,
    })
    if (isLoggedIn) void navigate('/admin', { replace: true })
  }

  return (
    <AdminShell>
      <div className="flex flex-1 items-center justify-center py-16">
        <Card className="w-[420px]">
          <form
            className="px-6 py-7"
            onSubmit={(event) => void submitLogin(event)}
            noValidate
          >
            <div className="flex flex-col items-center">
              <AppLogo size="56px" />
              <h1 className="text-ink mt-5 text-[22px] leading-none font-bold">
                관리자 로그인
              </h1>
            </div>

            <div className="mt-8 flex flex-col gap-5">
              <TextField
                label="관리자 코드"
                placeholder="코드를 입력하세요"
                autoComplete="username"
                autoFocus
                value={staffCode}
                onChange={(event) => setStaffCode(event.target.value)}
              />
              <TextField
                label="비밀번호"
                type="password"
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                value={staffPassword}
                onChange={(event) => setStaffPassword(event.target.value)}
              />
            </div>

            {errorMessage ? (
              <p role="alert" className="text-danger mt-4 text-[12.5px]">
                {errorMessage}
              </p>
            ) : null}

            <AdminButton
              type="submit"
              size="lg"
              fullWidth
              disabled={!isSubmittable}
              className="mt-7"
            >
              {isPending ? '로그인 중…' : '로그인'}
            </AdminButton>
          </form>
        </Card>
      </div>
    </AdminShell>
  )
}
