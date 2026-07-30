export interface FieldErrorProps {
  children: string
}

/**
 * 문제가 생긴 입력칸 바로 아래에 붙는 실패 문구.
 *
 * 실패 문구를 화면 아래 한 곳에 모으면 어느 칸을 고쳐야 하는지 알기 어렵다.
 * 폰 화면에서는 입력칸과 문구가 멀어져 스크롤 밖으로 나가기도 한다.
 *
 * -mt-1 은 위 입력칸과의 간격을 좁혀 같은 묶음으로 보이게 하는 값이다.
 * 부모의 gap 을 그대로 두면 다음 칸과 구분되지 않는다.
 */
export function FieldError({ children }: FieldErrorProps) {
  return (
    <p role="alert" className="text-danger -mt-1 text-[12.5px]">
      {children}
    </p>
  )
}
