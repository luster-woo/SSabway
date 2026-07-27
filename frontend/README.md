# Station Guide — Frontend

Vision AI 기반 외국인 역내 이동 동행 서비스의 프론트엔드입니다.
**사용자 앱(모바일 PWA)** 과 **관리자 앱(역무원 데스크톱)** 을 하나의 Vite 프로젝트에서 라우트로 분리해 운영합니다.

## 기술 스택

| 구분            | 기술                                         |
| --------------- | -------------------------------------------- |
| 빌드            | Vite 8 + React 19 + TypeScript               |
| 라우팅          | react-router-dom v7                          |
| 서버 상태       | TanStack Query v5                            |
| 클라이언트 상태 | Zustand                                      |
| 스타일링        | Tailwind CSS v4                              |
| 다국어          | i18next (en / ja / zh)                       |
| PWA             | vite-plugin-pwa + @vite-pwa/assets-generator |
| 린트 / 포맷     | oxlint + Prettier                            |
| 배포            | Docker (nginx) — Vercel 미사용               |

---

## 시작하기

```bash
npm install
npm run dev
```

| 스크립트                      | 설명                                        |
| ----------------------------- | ------------------------------------------- |
| `npm run dev`                 | 개발 서버 (LAN 접속 허용)                   |
| `npm run build`               | 타입 검사 + 프로덕션 빌드                   |
| `npm run preview`             | 빌드 결과 로컬 서빙 (PWA 검증용)            |
| `npm run lint`                | oxlint                                      |
| `npm run format`              | Prettier 일괄 적용                          |
| `npm run format:check`        | 포맷 검사만 (CI용)                          |
| `npm run generate-pwa-assets` | `public/favicon.svg` 기준 PWA 아이콘 재생성 |

### 권장 VS Code 확장

`.vscode/extensions.json`에 정의되어 있어 프로젝트를 열면 자동 추천됩니다.

- **Tailwind CSS IntelliSense** — 없으면 `index.css`의 `@theme`, `@utility`가 오류로 표시됩니다
- **Prettier**

---

## ⚠️ HTTPS 필수

**카메라(`getUserMedia`), WebRTC, Geolocation, 서비스워커는 모두 secure context에서만 동작합니다.**

- `http://localhost` — 동작 ✅
- `http://192.168.x.x:5173` (폰에서 LAN 접속) — **동작 안 함** ❌

실기기 테스트는 HTTPS 터널을 경유해야 합니다.

```bash
npm run dev
npx ngrok http 5173
```

---

## 폴더 구조

git은 빈 폴더를 추적하지 않으므로, 아래 구조는 **문서상의 합의**입니다. 각자 담당 기능을 구현할 때 해당 폴더를 만들어 주세요.

```
src/
├─ app/                  # 라우터, 전역 프로바이더, 진입점
│   ├─ router.tsx
│   └─ QueryProvider.tsx
│
├─ shared/               # 사용자 · 관리자 공용
│   ├─ api/              # axios 인스턴스, 인터셉터
│   ├─ webrtc/           # peer connection, 시그널링  ★양쪽 공유
│   ├─ types/            # ERD 기반 도메인 타입
│   ├─ ui/               # 버튼 등 원시 컴포넌트
│   ├─ hooks/
│   └─ lib/              # env, i18n, store
│
├─ user/                 # 모바일 PWA (외국인 이용자)
│   ├─ features/
│   │   ├─ qr-scan/          # QR 스캔 진입
│   │   ├─ sign-capture/     # 표지판 촬영 · 업로드
│   │   ├─ route-guide/      # 단계별 경로 안내
│   │   └─ consultation/     # 화상 상담 발신
│   └─ pages/
│
├─ admin/                # 데스크톱 (역무원)
│   ├─ features/
│   │   ├─ dashboard/        # 민원 대시보드
│   │   ├─ blacklist/        # 사용자 차단
│   │   └─ consultation/     # 화상 상담 수신
│   └─ pages/
│
└─ locales/              # en / ja / zh 번역 리소스
```

각 `features/*` 폴더 내부는 `components/`, `hooks/`, `api.ts`, `types.ts`로 통일합니다.

### 의존성 방향 규칙

```
user  →  shared      ✅
admin →  shared      ✅
user  ↔  admin       ❌ 절대 금지
shared → user/admin  ❌ 절대 금지
```

**`user`에서 `admin`을 import하면 코드 스플리팅이 조용히 깨집니다.** 관리자 코드가 사용자 번들에 합쳐져 모바일 이용자가 불필요한 용량을 받게 됩니다. 리뷰 시 반드시 확인해 주세요.

---

## 사용자 / 관리자 분리 구조

하나의 앱이지만 빌드 산출물과 캐싱 전략이 분리되어 있습니다.

| 구분                | 사용자 (`/`)        | 관리자 (`/admin/*`)        |
| ------------------- | ------------------- | -------------------------- |
| 대상 기기           | 모바일              | 데스크톱                   |
| 청크                | `assets/index-*.js` | `assets/admin-*.js` (lazy) |
| 서비스워커 precache | 포함                | **제외**                   |
| 오프라인 동작       | 지원                | 미지원 (의도된 동작)       |
| 언어                | en / ja / zh        | 한국어 고정                |

이 분리는 `vite.config.ts`의 세 설정이 **함께** 맞물려 동작합니다. 하나만 바꾸면 조용히 깨지므로 수정 시 주의하세요.

1. `build.rollupOptions.output.manualChunks` — `src/admin/` 코드를 `admin` 청크로 분리
2. `workbox.globIgnores: ['**/assets/admin-*']` — 해당 청크를 precache에서 제외
3. `workbox.navigateFallbackDenylist: [/^\/admin/]` — `/admin` 경로를 SW 폴백에서 제외

### 검증 방법

```bash
npm run build
```

- `dist/assets/`에 `admin-*.js`가 별도로 존재
- `dist/sw.js`의 precache 목록에 `assets/admin-` **없음**
- `npm run preview` 후 `/` 접속 시 Network 탭에 `admin-*.js` 요청 **없음**, `/admin` 진입 시에만 로드

### 스타일링 규칙

Tailwind는 모바일 우선입니다.

- **사용자 페이지**: 접두사 없는 클래스만 사용 (`md:`, `lg:` 사용 금지)
- **관리자 페이지**: 데스크톱 레이아웃을 접두사 없이 작성 + 레이아웃에서 `min-w-[1024px]` + `overflow-x-auto`로 감싸기

안전영역(노치·홈바) 대응 커스텀 유틸리티가 `src/index.css`에 정의되어 있습니다: `pt-safe`, `pb-safe`, `px-safe`

---

## 환경변수 — 런타임 주입 방식

Vite는 `import.meta.env`를 **빌드 시점에 치환**하므로, Docker 이미지 하나로 여러 환경을 쓸 수 없습니다.
이를 피하기 위해 `public/config.js`가 `window.__ENV__`를 채우고, 컨테이너 기동 시 이 파일을 덮어씁니다.

**앱 코드에서는 `import.meta.env`를 직접 쓰지 말고 항상 `@/shared/lib/env`를 경유하세요.**

```ts
import { env } from '@/shared/lib/env'

axios.create({ baseURL: env.API_BASE_URL })
```

`public/config.js`는 로컬 개발용 기본값이며 커밋 대상입니다.

---

## 코드 컨벤션

### tsconfig 제약 — 반드시 확인

`tsconfig.app.json`의 설정 때문에 아래 문법이 **컴파일 에러**입니다.

**① `erasableSyntaxOnly` → enum 사용 불가**

```ts
// ❌
enum ConsultationStatus {
  WAITING,
  ACTIVE,
  ENDED,
}

// ✅
export const CONSULTATION_STATUS = {
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
} as const

export type ConsultationStatus =
  (typeof CONSULTATION_STATUS)[keyof typeof CONSULTATION_STATUS]
```

생성자 파라미터 프로퍼티(`constructor(private x: string)`)도 금지됩니다.

**② `verbatimModuleSyntax` → 타입 import에 `type` 필수**

```ts
import type { Station } from '@/shared/types/station' // ✅
import { Station } from '@/shared/types/station' // ❌
```

**③ `noUnusedLocals` / `noUnusedParameters` → 미사용 변수도 빌드 실패**

`npm run dev`는 통과하지만 `npm run build`에서 실패합니다. push 전에 반드시 빌드를 돌려주세요.

### 상태관리 경계

- **서버에서 받아오는 데이터** → TanStack Query
- **클라이언트 전용 상태** (선택 언어, 인증, 현재 위치, 상담 세션) → Zustand

Zustand에 서버 데이터를 넣으면 캐시가 두 벌이 되어 디버깅이 어려워집니다.

### 경로 별칭

상대경로(`../../shared/api`) 대신 `@/` 별칭을 사용합니다.

```ts
import { userApi } from '@/shared/api/client'
```

---

## 배포

Vercel은 GitLab private 레포 연동 제약으로 사용하지 않습니다. Docker 이미지를 빌드해 AWS EC2에서 nginx로 서빙합니다.

```bash
docker build -t station-front .
docker run -p 80:80 \
  -e API_BASE_URL=https://api.example.com \
  -e SIGNALING_URL=wss://api.example.com/ws/signal \
  station-front
```

이미지는 GitLab CI에서 빌드해 GitLab Container Registry로 push합니다.
