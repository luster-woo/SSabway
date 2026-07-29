type ClassValue = string | false | null | undefined

/** 조건부 className을 합친다. (clsx 대체용 초경량 헬퍼) */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
