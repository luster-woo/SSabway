/** 재생 중인 video 요소의 현재 프레임을 JPEG Blob으로 캡처한다. */
export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D 컨텍스트를 만들 수 없습니다')
  context.drawImage(video, 0, 0)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('프레임 인코딩에 실패했습니다')),
      'image/jpeg',
      0.92,
    )
  })
}
