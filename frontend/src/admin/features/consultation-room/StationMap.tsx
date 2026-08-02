/**
 * ⚠️ shared 로 이동했다 (8/3) — 사용자 앱의 "현재 위치 보기"와 지도를 공유하기 위해서다.
 *
 * 이 파일은 기존 import 경로를 깨뜨리지 않기 위한 재수출이다.
 * admin 쪽 다음 작업에서 import 를 '@/shared/station-map/StationMap' 으로
 * 바꾸고 이 파일을 지워 달라. (새 코드는 shared 경로를 직접 쓸 것)
 */
export {
  StationMap,
  MARKER_COLOR,
  type StationMapProps,
} from '@/shared/station-map/StationMap'
