/**
 * ⚠️ shared 로 이동했다 (8/5) — 관리자 화상 상담의 [사용자 위치 보기] 가
 * 사용자와 **같은 지도 화면**을 띄워야 해서다. admin 이 user 레이어를
 * 참조하지 않도록 오버레이 자체를 shared/station-map 으로 옮겼다.
 *
 * 이 파일은 기존 import 경로를 깨뜨리지 않기 위한 재수출이다.
 * 새 코드는 '@/shared/station-map/StationMapOverlay' 를 직접 쓸 것.
 */
export {
  StationMapOverlay,
  type StationMapOverlayProps,
  type StationMapStatus,
} from '@/shared/station-map/StationMapOverlay'
