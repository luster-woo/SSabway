# 사용법 안내 GIF (시작 페이지 → 「사용법 보기」 모달)

`src/user/features/start/TutorialModal.tsx` 가 선택된 언어 폴더에서 3장을 순서대로 읽는다.
파일 이름·크기는 `src/user/features/start/tutorialSteps.ts` 와 짝이므로 함께 고쳐야 한다.

    ko|en|ja|zh /
      signs.gif        640x262  1) 표지판을 이어 위치를 안내한다
      photo-guide.gif  640x330  2) 표지판을 어떻게 찍는다
      video-call.gif   640x474  3) 막히면 역무원과 화상 상담한다

## 원본과 가공

원본은 1280x720 슬라이드(장당 2~4MB, 12장 합계 약 31MB)다. 폰 모달은 폭이 약 360px 이라
그대로 쓰면 4배 과한 해상도를 내려받게 되고, 지하 약전파 구간에서 로딩이 눈에 띈다.
그래서 **여백을 잘라내고 축소**해 약 4.8MB 로 줄였다. (원본은 저장소에 두지 않는다)

여백 크롭이 핵심이다. 슬라이드는 16:9 안에 콘텐츠가 가운데 몰려 있어서, 그대로 폰 폭에
맞추면 글자가 읽히지 않는다. 특히 `video-call` 은 콘텐츠가 가로 45% 뿐이라 잘라내는 것만으로
글자가 2배 커진다.

크롭 박스는 **4개 언어의 합집합**으로 잡는다. 언어마다 문구 길이가 달라(영어가 가장 넓다)
언어별로 자르면 같은 페이지가 언어에 따라 다른 비율이 되고, 모달 미디어 영역 높이가
언어를 바꿀 때마다 달라진다.

재가공이 필요하면(원본이 갱신되면) 언어별로 모든 프레임의 비흰색 영역 합집합을 구해
아래 명령의 `crop` 값을 정한 뒤 실행한다. `fps=12` · `max_colors=128` 은 위 문구들의
가독성을 확인하며 정한 값이다.

    ffmpeg -i <원본>.gif \
      -vf "crop=W:H:X:Y,fps=12,scale=640:-1:flags=lanczos,split[s0][s1];\
    [s0]palettegen=max_colors=128:stats_mode=diff[p];\
    [s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
      -loop 0 <출력>.gif

## PWA precache

GIF 는 `vite-plugin-pwa` 의 기본 `globPatterns`(js/css/html/ico/png/svg/webp/woff)에 없어
**precache 대상이 아니다.** 모달을 처음 열 때 내려오고 그 뒤에는 HTTP 캐시가 받는다.
precache 에 넣으면 모달을 열지 않는 사용자도 첫 방문에 4.8MB 를 받게 되므로 넣지 말 것.
