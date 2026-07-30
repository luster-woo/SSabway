/**
 * 재생 중인 video 요소의 현재 프레임을 JPEG Blob으로 캡처한다.
 *
 * 프리뷰는 object-cover에 transform: scale(zoom)까지 얹혀 그려지므로 원본
 * 프레임 전체가 화면에 보이지 않는다. 보이는 영역만 잘라내야 사용자가 프레임
 * 가이드에 맞춘 구도와 캡처 결과가 일치한다.
 *
 * 잘라낸 영역을 확대하지 않고 원본 해상도 그대로 담는다 — 표지판 인식
 * 정확도를 위해 화질을 보존한다.
 *
 * @param zoom 프리뷰에 적용 중인 CSS 배율
 */
export async function captureFrame(
  video: HTMLVideoElement,
  zoom = 1,
): Promise<Blob> {
  const { videoWidth, videoHeight, clientWidth, clientHeight } = video
  if (!videoWidth || !videoHeight) {
    throw new Error('아직 프레임이 준비되지 않았습니다')
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D 컨텍스트를 만들 수 없습니다')

  // 레이아웃 전이라 크기를 못 구하면 원본 전체를 캡처한다
  const isMeasured = clientWidth > 0 && clientHeight > 0
  // object-cover가 원본을 얼마나 확대해 컨테이너를 덮는지
  const coverScale = isMeasured
    ? Math.max(clientWidth / videoWidth, clientHeight / videoHeight)
    : 1
  const totalScale = coverScale * Math.max(zoom, 1)

  // 화면에 실제로 보이는 원본 영역 (transform-origin이 중앙이므로 중앙 기준)
  const sourceWidth = isMeasured
    ? Math.min(videoWidth, clientWidth / totalScale)
    : videoWidth
  const sourceHeight = isMeasured
    ? Math.min(videoHeight, clientHeight / totalScale)
    : videoHeight
  const sourceX = (videoWidth - sourceWidth) / 2
  const sourceY = (videoHeight - sourceHeight) / 2

  canvas.width = Math.round(sourceWidth)
  canvas.height = Math.round(sourceHeight)
  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('프레임 인코딩에 실패했습니다')),
      'image/jpeg',
      0.92,
    )
  })
}
