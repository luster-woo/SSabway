import { useEffect } from 'react'

/**
 * 관리자 화면에서만 favicon 을 관리자용(네이비 프레임 + 흰 배경 + 네이비 S)으로
 * 바꾼다. AdminApp 은 `/admin/*` 라우트에서만 마운트되므로, 마운트 시 아이콘을
 * 관리자용으로 교체하고 언마운트 시 원래 사용자(PWA)용으로 되돌린다.
 *
 * favicon 링크는 vite-plugin-pwa 가 index.html 에 주입한다(id 없음):
 *   <link rel="icon" href="/favicon.ico" sizes="48x48">
 *   <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml">
 * 두 링크의 href 만 관리자용으로 바꾸면 된다. SVG 를 지원하는 최신 브라우저는
 * svg 를, 그 외에는 ico 를 쓴다.
 */
export function useAdminFavicon() {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'),
    )

    // 주입된 아이콘 링크가 없으면(예: 커스텀 index.html) 하나 만들어 둔다.
    if (links.length === 0) {
      const el = document.createElement('link')
      el.rel = 'icon'
      el.type = 'image/svg+xml'
      el.href = '/admin-favicon.svg'
      document.head.appendChild(el)
      return () => el.remove()
    }

    const originals = links.map((el) => ({ el, href: el.getAttribute('href') }))

    for (const el of links) {
      const type = el.getAttribute('type')
      const href = el.getAttribute('href') ?? ''
      if (type === 'image/svg+xml' || href.endsWith('.svg')) {
        el.setAttribute('href', '/admin-favicon.svg')
      } else if (href.endsWith('.ico')) {
        el.setAttribute('href', '/admin-favicon.ico')
      } else {
        el.setAttribute('href', '/admin-favicon.svg')
      }
    }

    return () => {
      for (const { el, href } of originals) {
        if (href === null) el.removeAttribute('href')
        else el.setAttribute('href', href)
      }
    }
  }, [])
}
