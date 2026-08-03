package com.ssafy.ssabway.domain.route.entity;

import com.ssafy.ssabway.global.common.Language;
import lombok.Getter;

import java.util.Arrays;

/*
    ODsay의 subwayCode를 우리 상수로 옮긴다.
    프론트는 이 상수로 노선 색과 동그라미 안 번호를 결정한다.

    name("대구 1호선")이 아니라 subwayCode로 매핑하는 이유:
    표시 문자열은 ODsay가 다듬을 수 있지만 코드는 식별자라 안정적이다.

    ⚠️ valueOf가 아니라 from을 쓴다. 노선 목록은 외부가 정하는 것이라
       우리가 모르는 코드가 올 수 있다(새 노선 개통 등). 그때 예외를 던지면
       경로 하나 때문에 응답 전체가 500이 되므로 UNKNOWN으로 떨어뜨린다.
       BlacklistReason처럼 우리가 정한 닫힌 집합과는 성격이 다르다.
 */
public enum SubwayLane {

    DAEGU_LINE_1(41, "1",
            new Terminal("설화명곡", "Seolhwa-Myeonggok", "舌化椧谷", "舌化椧谷"),
            new Terminal("하양", "Hayang", "ハヤン", "河阳")),

    DAEGU_LINE_2(42, "2",
            new Terminal("문양", "Munyang", "汶陽", "汶阳"),
            new Terminal("영남대", "Yeongnam Univ.", "嶺南大", "岭南大学")),

    DAEGU_LINE_3(43, "3",
            new Terminal("칠곡경대병원", "Chilgok KNU Hospital", "漆谷慶大病院", "漆谷庆北大学医院"),
            new Terminal("용지", "Yongji", "ヨンジ", "龙池")),

    DAEGYEONG_LINE(48, "대경",
            new Terminal("구미", "Gumi", "亀尾", "九美"),
            new Terminal("경산", "Gyeongsan", "慶山", "庆山")),

    UNKNOWN(0, "?", null, null);

    private static final int UP = 1;
    private static final int DOWN = 2;

    private final int subwayCode;
    @Getter
    private final String label;           // 화면 동그라미에 표시할 짧은 이름
    private final Terminal upTerminal;    // wayCode 1
    private final Terminal downTerminal;  // wayCode 2

    SubwayLane(int subwayCode, String label, Terminal upTerminal, Terminal downTerminal) {
        this.subwayCode = subwayCode;
        this.label = label;
        this.upTerminal = upTerminal;
        this.downTerminal = downTerminal;
    }

    public static SubwayLane from(Integer subwayCode) {
        if (subwayCode == null) return UNKNOWN;

        return Arrays.stream(values())
                .filter(lane -> lane.subwayCode == subwayCode)
                .findFirst()
                .orElse(UNKNOWN);
    }

    /*
        wayCode로 방면 종점명을 결정한다.

        ODsay의 way 필드는 종점이 아니라 그 구간의 도착역이라(대구역→칠성시장이면 "칠성시장")
        방면 표시에 쓸 수 없어 직접 매핑한다.

        환승 이후 구간에는 wayCode가 없을 수 있고(명세상 첫 구간만 필수),
        UNKNOWN 노선이면 종점도 알 수 없어 그때는 null을 반환한다.
        "방면" 문구는 프론트가 붙인다.
     */
    public String directionOf(Integer wayCode, Language language) {
        Terminal terminal = terminalOf(wayCode);

        return terminal == null ? null : terminal.nameOf(language);
    }

    private Terminal terminalOf(Integer wayCode) {
        if (wayCode == null) return null;
        if (wayCode == UP) return upTerminal;
        if (wayCode == DOWN) return downTerminal;
        return null;
    }

    /*
        종점 하나의 언어별 표기.

        문자열 4개를 enum 생성자에 나란히 넣으면 인자가 10개가 되어
        순서를 하나 어긋나게 써도 컴파일이 통과한다(상행/하행이 뒤바뀜).
        record로 묶으면 new Terminal(...) 단위로 눈에 보인다.
     */
    private record Terminal(String ko, String en, String ja, String zh) {

        // default를 두지 않아 Language에 상수가 추가되면 컴파일 에러로 누락이 잡힌다
        String nameOf(Language language) {
            return switch (language) {
                case KO -> ko;
                case EN -> en;
                case JA -> ja;
                case ZH -> zh;
            };
        }
    }
}