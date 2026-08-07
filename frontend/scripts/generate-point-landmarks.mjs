/**
 * daegu_navigation.json → daeguPointLandmarks.json 생성기.
 *
 * 표지판 인식(POST /routes/sign)이 돌려주는 것은 `S3_16` 같은 노드 id 뿐이라,
 * 그대로 화면에 뿌리면 "대구역 S3_16" 이 되어 사용자가 읽을 수 없다. 이 스크립트가
 * 각 노드 id 를 "층 + 시설 종류 + (출구 번호)" 라는 재료로 옮겨 두면, 화면에서는
 * describeStationPoint 가 그 재료를 로케일 문구("대구역 3층 6번 출구 앞")로 만든다.
 *
 * 매핑 규칙:
 *   SIGNAGE  — 좌표상 가장 가까운, type 이 SIGNAGE 가 아닌 노드를 랜드마크로
 *              삼는다. 표지판에는 자기 이름이 없어서 옆 시설을 빌려 쓴다.
 *              층을 가리지 않는다 — 이 도면은 출구·개찰구·편의시설을 모두 지상
 *              레벨(floor "0")에 한 번씩만 두고, 1~3층에는 엘리베이터와 표지판만
 *              둔다. 층을 강제하면 상층 표지판이 전부 "엘리베이터"로만 뭉개져
 *              "6번 출구" 같은 안내를 못 한다. 그래서 시설은 층을 넘어 찾되,
 *              화면에 쓰는 층은 아래대로 **표지판 자신의 층**이다.
 *   그 외    — 자기 자신(출구·개찰구·엘리베이터·편의시설은 이미 목적지다).
 *
 * 표시 층은 언제나 그 노드 자신의 floor 다(SIGNAGE 는 표지판이 선 층, 나머지는
 * 자기 층). 랜드마크가 다른 층(지상 레벨)에 있어도, 사용자가 서 있는 층으로 말한다.
 *
 * 거리는 SVG 의 unitsPerMeter 로 좌표 단위를 m 로 환산해 구한다. 15m 이하면
 * near=true("앞"), 넘으면 near=false("근처")로 문구를 눅인다.
 *
 * 문구 자체는 이 파일이 아니라 로케일 4개(ko/en/ja/zh)의 landmark.* 가 만든다.
 * 여기서는 로케일 키(place)와 숫자(number/floor)만 정한다.
 *
 * 실행:  node scripts/generate-point-landmarks.mjs
 *        (frontend 디렉터리에서. --check 를 붙이면 쓰지 않고 최신 여부만 확인한다)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(HERE, '../../docs/map/daegu_navigation.json')
const OUTPUT = resolve(
  HERE,
  '../src/shared/station-map/daeguPointLandmarks.json',
)

/** 이 매핑 표가 다루는 역(한국어 표기). daegu_navigation.json 은 대구역 전용이다. */
const STATION = '대구역'

/** near/far 를 가르는 경계(m). 이하면 "앞", 넘으면 "근처". */
const NEAR_MAX_M = 15

/** unitsPerMeter 를 못 읽었을 때의 기본값(daegu_map viewBox 기준). */
const FALLBACK_UNITS_PER_METER = 26.077

/** POI 는 종류가 category 로 갈린다 → 로케일 landmark.place.* 키로 옮긴다. */
const POI_CATEGORY_PLACE = {
  STORE: 'store',
  ATM: 'atm',
  TICKET_OFFICE: 'ticketOffice',
  TICKET_MACHINE: 'ticketMachine',
  TOILET: 'toilet',
}

/** SIGNAGE 가 아닌 노드 type → 로케일 landmark.place.* 키. */
const TYPE_PLACE = {
  EXIT: 'exit',
  GATE: 'gate',
  ELEVATOR: 'elevator',
}

/**
 * 노드가 가리키는 로케일 place 키를 정한다.
 * POI 는 category 로, 나머지는 type 으로 가른다. 모르는 조합이면 null.
 */
function placeOf(node) {
  if (node.type === 'POI') return POI_CATEGORY_PLACE[node.category] ?? null
  return TYPE_PLACE[node.type] ?? null
}

/**
 * 출구 번호. 출구 id 는 `EX0_06` 처럼 끝 두 자리가 번호라, 거기서 뽑는다.
 * (지도 데이터가 출구 번호를 따로 안 들고 있어 id 규약에 기댄다.)
 */
function exitNumber(node) {
  const m = /_(\d+)$/.exec(node.id)
  return m ? Number(m[1]) : undefined
}

function euclid(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** 소수 첫째 자리로 반올림(기존 표기와 맞춘다). */
function round1(n) {
  return Math.round(n * 10) / 10
}

function build() {
  const nav = JSON.parse(readFileSync(SOURCE, 'utf8'))
  const nodes = nav.nodes
  const unitsPerMeter = nav.svg?.unitsPerMeter ?? FALLBACK_UNITS_PER_METER

  const points = {}
  const warnings = []

  for (const node of nodes) {
    // 랜드마크가 될 노드를 고른다: SIGNAGE 는 최근접 비-SIGNAGE(층 무관), 그 외는 자기 자신.
    let landmark
    let distanceUnits
    if (node.type === 'SIGNAGE') {
      const facilities = nodes.filter((n) => n.type !== 'SIGNAGE')
      if (facilities.length === 0) {
        warnings.push(`${node.id}: 비-SIGNAGE 노드가 하나도 없어 건너뜀`)
        continue
      }
      // 거리 오름차순, 동률이면 id 오름차순으로 뽑는다 — 동률 표지판(예: 발매기와
      // 매표소가 같은 거리)에서 매번 같은 결과가 나오도록 결정론적으로 고른다.
      landmark = facilities.reduce((best, n) => {
        const dn = euclid(node, n)
        const db = euclid(node, best)
        if (dn < db) return n
        if (dn === db && n.id < best.id) return n
        return best
      })
      distanceUnits = euclid(node, landmark)
    } else {
      landmark = node
      distanceUnits = 0
    }

    const place = placeOf(landmark)
    if (!place) {
      warnings.push(
        `${node.id}: 랜드마크 ${landmark.id}(${landmark.type}/${landmark.category ?? '-'}) 를 옮길 place 키 없음 — 건너뜀`,
      )
      continue
    }

    const distanceM = round1(distanceUnits / unitsPerMeter)

    // 필드 순서를 기존 파일과 맞춰 넣는다: place, number?, floor?, near, nearest, distanceM
    const entry = { place }
    if (place === 'exit') {
      const number = exitNumber(landmark)
      if (number !== undefined) entry.number = number
    }
    // 표시 층은 노드 자신의 층(사용자가 서 있는 층). 랜드마크(지상 시설)의 층이
    // 아니다. "0"(지상 레벨)은 문구에서 빼므로 아예 담지 않는다.
    if (node.floor && node.floor !== '0') entry.floor = node.floor
    entry.near = distanceM <= NEAR_MAX_M
    entry.nearest = landmark.id
    entry.distanceM = distanceM

    points[node.id] = entry
  }

  // id 사전순으로 정렬해 diff 를 안정적으로 만든다.
  const sorted = {}
  for (const id of Object.keys(points).sort()) sorted[id] = points[id]

  return {
    doc: {
      _source: 'docs/map/daegu_navigation.json',
      _rule:
        'SIGNAGE 노드는 좌표상 가장 가까운 비-SIGNAGE 노드를(층 무관 — 출구·개찰구·편의시설이 모두 지상 레벨에만 있어서다), 그 밖의 노드는 자기 자신을 랜드마크로 삼는다. floor 는 노드 자신의 값(사용자가 선 층)이며 "0"(지상 레벨)이면 생략한다. near 는 거리 15m 이하 — true 면 "앞", false 면 "근처" 로 말한다.',
      _fields:
        'place 는 로케일의 landmark.place.* 키. number 는 출구 번호(place=exit 일 때만). nearest·distanceM 은 어떻게 뽑혔는지 확인하려고 남긴 근거 값이라 화면에는 쓰지 않는다.',
      _editing:
        '이 파일은 scripts/generate-point-landmarks.mjs 가 만든다 — 직접 고치지 말고 스크립트를 다시 돌린다. 문구가 어색하면 로케일 4개(ko/en/ja/zh)의 landmark.* 를 고친다.',
      station: STATION,
      points: sorted,
    },
    warnings,
  }
}

function main() {
  const check = process.argv.includes('--check')
  const { doc, warnings } = build()
  const json = JSON.stringify(doc, null, 2) + '\n'

  for (const w of warnings) console.warn('⚠️ ', w)

  if (check) {
    const current = readFileSync(OUTPUT, 'utf8')
    if (current !== json) {
      console.error(
        `✗ ${OUTPUT} 가 최신이 아닙니다. \`node scripts/generate-point-landmarks.mjs\` 를 다시 돌리세요.`,
      )
      process.exit(1)
    }
    console.log('✓ daeguPointLandmarks.json 최신 상태')
    return
  }

  writeFileSync(OUTPUT, json)
  console.log(
    `✓ ${Object.keys(doc.points).length}개 노드 매핑을 ${OUTPUT} 에 썼습니다.`,
  )
}

main()
