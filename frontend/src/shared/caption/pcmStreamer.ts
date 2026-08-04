/**
 * MediaStream 의 오디오를 16kHz mono PCM16 조각으로 뽑아 콜백에 넘긴다.
 *
 * AI 자막 서버 입력 형식(docs/caption-ai-contract.md)을 만드는 계층이다.
 *
 * MediaRecorder 를 쓰지 않는 이유: timeslice 로 잘린 조각은 두 번째부터
 * webm 컨테이너 헤더가 없어 조각 단위로는 디코딩되지 않는다. 헤더가 아예
 * 없는 raw PCM 을 직접 뽑으면 서버가 어느 경계에서 잘라 붙여도 무방하다.
 *
 * ⚠️ 원격(WebRTC) 트랙을 Web Audio 로 읽을 때, 그 스트림이 <audio>/<video>
 *    엘리먼트에서도 재생 중이어야 소리가 잡히는 Chrome 특성이 있다.
 *    상담 화면은 OpenViduVideo 가 이미 재생하므로 충족된다. 이 모듈을
 *    단독 페이지에서 테스트하다 무음이 잡히면 이것부터 의심할 것.
 */

export const PCM_SAMPLE_RATE = 16_000

/** 조각 하나의 길이. 320ms @16kHz = 5,120 샘플 = 10,240 bytes */
const CHUNK_MS = 320

export interface PcmStreamerHandle {
  stop(): void
}

/**
 * AudioWorklet 본체. 별도 파일로 두면 vite 설정이 필요해서 문자열로 들고
 * 있다가 Blob URL 로 로드한다. 오디오 스레드에서 도는 코드라 여기서는
 * 복사해 넘기는 일만 하고, 리샘플링·변환은 메인 스레드가 한다.
 */
const WORKLET_SOURCE = `
class PcmTap extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel) this.port.postMessage(channel.slice(0))
    return true
  }
}
registerProcessor('pcm-tap', PcmTap)
`

/** 선형 보간 다운샘플 + float(-1..1) → int16. STT 용도로는 이 품질이면 충분하다. */
function toPcm16(
  input: Float32Array,
  fromRate: number,
): Int16Array<ArrayBuffer> {
  const ratio = fromRate / PCM_SAMPLE_RATE
  const outLength = Math.floor(input.length / ratio)
  const out = new Int16Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio
    const base = Math.floor(pos)
    const next = Math.min(base + 1, input.length - 1)
    const frac = pos - base
    const sample = input[base] * (1 - frac) + input[next] * frac
    const clamped = Math.max(-1, Math.min(1, sample))
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
  }
  return out
}

export async function startPcmStreamer(
  stream: MediaStream,
  onChunk: (pcm: Int16Array<ArrayBuffer>) => void,
): Promise<PcmStreamerHandle> {
  const ctx = new AudioContext()
  // 사용자 제스처 없이 만들어지면 suspended 로 시작할 수 있다.
  // 상담 화면은 버튼을 눌러 진입하므로 보통 불필요하지만, 비용이 없다.
  void ctx.resume()

  const workletUrl = URL.createObjectURL(
    new Blob([WORKLET_SOURCE], { type: 'application/javascript' }),
  )
  try {
    await ctx.audioWorklet.addModule(workletUrl)
  } finally {
    URL.revokeObjectURL(workletUrl)
  }

  const source = ctx.createMediaStreamSource(stream)
  const tap = new AudioWorkletNode(ctx, 'pcm-tap')
  // destination 에는 연결하지 않는다 — 이미 <video> 가 재생 중이라
  // 여기서 또 연결하면 상대 음성이 이중으로 들린다.
  source.connect(tap)

  // ctx.sampleRate(보통 48k) 기준으로 모았다가 조각 단위로 변환한다.
  const flushAt = Math.round((ctx.sampleRate * CHUNK_MS) / 1000)
  let pending: Float32Array[] = []
  let pendingLength = 0

  tap.port.onmessage = (event: MessageEvent<Float32Array>) => {
    pending.push(event.data)
    pendingLength += event.data.length
    if (pendingLength < flushAt) return

    const merged = new Float32Array(pendingLength)
    let offset = 0
    for (const block of pending) {
      merged.set(block, offset)
      offset += block.length
    }
    pending = []
    pendingLength = 0
    onChunk(toPcm16(merged, ctx.sampleRate))
  }

  return {
    stop() {
      tap.port.onmessage = null
      source.disconnect()
      tap.disconnect()
      void ctx.close()
    },
  }
}
