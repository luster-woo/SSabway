package com.ssafy.ssabway.domain.navigation.service;

import com.ssafy.ssabway.domain.navigation.model.NavEdge;
import com.ssafy.ssabway.domain.navigation.model.NavigationGraph;
import com.ssafy.ssabway.domain.navigation.model.Point;
import com.ssafy.ssabway.global.common.Language;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/*
    안내 문구에 손으로 쓴 방향 정보가 없을 때, 엣지 geometry 로 실제 꺾이는
    각도를 계산해 문구를 대신 만든다.

    좌표계는 도면 좌표(픽셀 단위, y 아래 방향 증가)를 그대로 쓴다. 방향의
    절대값이 아니라 "진입 방향 대비 진출 방향이 얼마나/어느 쪽으로 꺾이는가"만
    보므로 좌표계가 실세계 방위와 안 맞아도 상관없다.

    부호 규칙은 이미 검증된 값으로 맞췄다 — E030(S3_05→S2_01) 구간을 손으로
    계산한 결과(왼쪽 91°, 오른쪽 90°)와 이 공식의 부호가 정확히 일치한다.
        음수 = 왼쪽,  양수 = 오른쪽
 */
@Component
public class TurnGuideGenerator {

    // 44.4°(S3_06 실측 — 대각선으로 느껴짐)가 STRAIGHT 로 묻히지 않도록 40으로 확정.
    private static final double STRAIGHT_THRESHOLD_DEG = 40;
    // 56.3°는 대각선, 90°는 완전한 회전 — 그 경계로 확정한 값.
    private static final double DIAGONAL_THRESHOLD_DEG = 75;
    private static final double UTURN_THRESHOLD_DEG = 160;

    public enum Turn { STRAIGHT, DIAGONAL_LEFT, LEFT, DIAGONAL_RIGHT, RIGHT, UTURN }

    /*
        pivot 노드에서 incoming 을 타고 들어와 outgoing 으로 나갈 때 꺾이는 각도.
        직선이 아닌 엣지는 geometry 의 pivot 쪽 마지막/첫 구간 방향을 쓴다
        (노드-대-노드 직선을 쓰면 실제로 꺾이는 지점을 지나쳐 버린다).
     */
    public Turn classify(NavigationGraph graph, NavEdge incoming, NavEdge outgoing, String pivotId) {
        double bearingIn = bearingInto(graph, incoming, pivotId);
        double bearingOut = bearingOutOf(graph, outgoing, pivotId);
        double turn = normalize(bearingOut - bearingIn);

        if (Math.abs(turn) >= UTURN_THRESHOLD_DEG) {
            return Turn.UTURN;
        }
        if (Math.abs(turn) < STRAIGHT_THRESHOLD_DEG) {
            return Turn.STRAIGHT;
        }
        if (Math.abs(turn) < DIAGONAL_THRESHOLD_DEG) {
            return turn > 0 ? Turn.DIAGONAL_RIGHT : Turn.DIAGONAL_LEFT;
        }
        return turn > 0 ? Turn.RIGHT : Turn.LEFT;
    }

    private double bearingInto(NavigationGraph graph, NavEdge edge, String arriveId) {
        Point arrive = graph.node(arriveId).point();
        List<Point> geometry = edge.geometry();

        Point prev;
        if (geometry.isEmpty()) {
            prev = graph.node(edge.opposite(arriveId)).point();
        } else {
            List<Point> ordered = edge.to().equals(arriveId) ? geometry : reversed(geometry);
            prev = ordered.size() >= 2 ? ordered.get(ordered.size() - 2) : graph.node(edge.opposite(arriveId)).point();
        }
        return bearing(prev, arrive);
    }

    private double bearingOutOf(NavigationGraph graph, NavEdge edge, String departId) {
        Point depart = graph.node(departId).point();
        List<Point> geometry = edge.geometry();

        Point next;
        if (geometry.isEmpty()) {
            next = graph.node(edge.opposite(departId)).point();
        } else {
            List<Point> ordered = edge.from().equals(departId) ? geometry : reversed(geometry);
            next = ordered.size() >= 2 ? ordered.get(1) : graph.node(edge.opposite(departId)).point();
        }
        return bearing(depart, next);
    }

    private double bearing(Point from, Point to) {
        return Math.toDegrees(Math.atan2(to.y() - from.y(), to.x() - from.x()));
    }

    private List<Point> reversed(List<Point> points) {
        List<Point> copy = new ArrayList<>(points);
        Collections.reverse(copy);
        return copy;
    }

    /* -180 ~ 180 범위로 정규화 */
    private double normalize(double degrees) {
        double d = degrees % 360;
        if (d > 180) d -= 360;
        if (d <= -180) d += 360;
        return d;
    }

    // ── 문구 생성 ──────────────────────────────────────────────────────

    // 5m 이하면 "몇 m"가 체감상 의미가 없어(표지판이 바로 보이는 거리) 거리를 뺀다.
    private static final int SHORT_DISTANCE_THRESHOLD_M = 5;

    /* 표지판 등 일반 구간. 직진이면서 손글씨 문구가 있으면 이 메서드를 타지 않는다 */
    public String plain(Turn turn, int meters, Language language) {
        if (turn == Turn.STRAIGHT) {
            return switch (language) {
                case KO -> meters + "m 직진하세요";
                case EN -> "Go straight " + meters + " m";
                case JA -> meters + "m直進してください";
                case ZH -> "直行" + meters + "米";
            };
        }
        return turnPhrase(turn, meters, language);
    }

    /*
        "몇 m 이동한 뒤 꺾으세요"는 정확히 어디서 꺾어야 하는지 애매하다는 피드백으로
        바꿨다. 표지판을 기준점으로 삼아 "표지판에서 꺾으세요"라고 하면 어디서
        꺾을지 명확해진다. 5m 이하는 표지판이 바로 눈앞이라 거리를 아예 뺀다.
     */
    private String turnPhrase(Turn turn, int meters, Language language) {
        boolean near = meters <= SHORT_DISTANCE_THRESHOLD_M;
        return switch (turn) {
            case LEFT -> switch (language) {
                case KO -> near ? "표지판에서 왼쪽으로 꺾으세요" : meters + "m 이동해 표지판에서 왼쪽으로 꺾으세요";
                case EN -> near ? "Turn left at the sign" : "Walk " + meters + " m to the sign, then turn left";
                case JA -> near ? "案内板の位置で左に曲がってください" : meters + "m進んで案内板の位置で左に曲がってください";
                case ZH -> near ? "在指示牌处左转" : "前进" + meters + "米后在指示牌处左转";
            };
            case DIAGONAL_LEFT -> switch (language) {
                case KO -> near ? "표지판에서 왼쪽 대각선 방향으로 꺾으세요" : meters + "m 이동해 표지판에서 왼쪽 대각선 방향으로 꺾으세요";
                case EN -> near ? "Turn diagonally left at the sign" : "Walk " + meters + " m to the sign, then turn diagonally left";
                case JA -> near ? "案内板の位置で斜め左に曲がってください" : meters + "m進んで案内板の位置で斜め左に曲がってください";
                case ZH -> near ? "在指示牌处斜向左转" : "前进" + meters + "米后在指示牌处斜向左转";
            };
            case RIGHT -> switch (language) {
                case KO -> near ? "표지판에서 오른쪽으로 꺾으세요" : meters + "m 이동해 표지판에서 오른쪽으로 꺾으세요";
                case EN -> near ? "Turn right at the sign" : "Walk " + meters + " m to the sign, then turn right";
                case JA -> near ? "案内板の位置で右に曲がってください" : meters + "m進んで案内板の位置で右に曲がってください";
                case ZH -> near ? "在指示牌处右转" : "前进" + meters + "米后在指示牌处右转";
            };
            case DIAGONAL_RIGHT -> switch (language) {
                case KO -> near ? "표지판에서 오른쪽 대각선 방향으로 꺾으세요" : meters + "m 이동해 표지판에서 오른쪽 대각선 방향으로 꺾으세요";
                case EN -> near ? "Turn diagonally right at the sign" : "Walk " + meters + " m to the sign, then turn diagonally right";
                case JA -> near ? "案内板の位置で斜め右に曲がってください" : meters + "m進んで案内板の位置で斜め右に曲がってください";
                case ZH -> near ? "在指示牌处斜向右转" : "前进" + meters + "米后在指示牌处斜向右转";
            };
            case UTURN -> switch (language) {
                case KO -> near ? "표지판에서 왔던 방향으로 돌아가세요" : meters + "m 이동해 표지판에서 왔던 방향으로 돌아가세요";
                case EN -> near ? "Turn back at the sign" : "Walk " + meters + " m to the sign, then turn back";
                case JA -> near ? "案内板の位置で来た方向に戻ってください" : meters + "m進んで案内板の位置で来た方向に戻ってください";
                case ZH -> near ? "在指示牌处原路返回" : "前进" + meters + "米后在指示牌处原路返回";
            };
            case STRAIGHT -> throw new IllegalArgumentException("STRAIGHT 는 turnPhrase 를 쓰지 않는다 — plain() 참고");
        };
    }

    /* 오르는 계단·에스컬레이터. 방향은 일부러 안 알려준다(요청사항) */
    public String stairsUp(int meters, Language language) {
        return switch (language) {
            case KO -> "계단을 올라 " + meters + "m 이동하세요";
            case EN -> "Go up the stairs and walk " + meters + " m";
            case JA -> "階段を上って" + meters + "m進んでください";
            case ZH -> "上楼梯后前进" + meters + "米";
        };
    }

    /* 내려가는 계단·에스컬레이터. 방향은 알려준다 */
    public String stairsDown(Turn turn, int meters, Language language) {
        if (turn == Turn.STRAIGHT) {
            return switch (language) {
                case KO -> "계단을 내려가 " + meters + "m 이동하세요";
                case EN -> "Go down the stairs, walk " + meters + " m";
                case JA -> "階段を下りて" + meters + "m進んでください";
                case ZH -> "下楼梯后前进" + meters + "米";
            };
        }
        String prefix = switch (language) {
            case KO -> "계단을 내려가 ";
            case EN -> "Go down the stairs, ";
            case JA -> "階段を下りて";
            case ZH -> "下楼梯后";
        };
        return prefix + turnPhrase(turn, meters, language);
    }

    /* 계단은 있는데 오르는지 내려가는지 알 수 없음. 방향은 생략, 오르내림도 단정하지 않는다 */
    public String stairsUnknown(int meters, Language language) {
        return switch (language) {
            case KO -> "계단을 이용해 " + meters + "m 이동하세요";
            case EN -> "Use the stairs and walk " + meters + " m";
            case JA -> "階段を利用して" + meters + "m進んでください";
            case ZH -> "利用楼梯前进" + meters + "米";
        };
    }
}
