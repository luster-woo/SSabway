import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button, MobileScreen, NotFound } from '@/shared/ui'

/**
 * 사용자 404 — 매칭되는 라우트가 없을 때.
 *
 * 이전에는 시작 페이지로 조용히 리다이렉트했다. 그러면 주소를 잘못 입력했는지
 * 링크가 깨졌는지 알 수 없어 같은 실수를 반복하게 된다.
 *
 * replace 로 이동해 뒤로가기가 다시 404 로 돌아오지 않게 한다.
 */
export default function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <MobileScreen>
      <NotFound
        title={t('common.notFound.title')}
        description={t('common.notFound.description')}
        action={
          <Button
            size="lg"
            fullWidth
            onClick={() => void navigate('/', { replace: true })}
          >
            {t('common.goHome')}
          </Button>
        }
      />
    </MobileScreen>
  )
}
