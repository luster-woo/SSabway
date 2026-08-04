/**
 * shared/ui/Dialog 로 승격되어 이동했다 (8/4 — 표지판 분석 실패 모달에서도
 * 필요해져 파일 머리의 TODO 대로 올림). 새 코드는 '@/shared/ui' 의 Dialog 를
 * 직접 쓸 것. 남은 import 가 없어지면 이 파일은 지워도 된다.
 */
export {
  Dialog as CallDialog,
  type DialogProps as CallDialogProps,
} from '@/shared/ui/Dialog'
