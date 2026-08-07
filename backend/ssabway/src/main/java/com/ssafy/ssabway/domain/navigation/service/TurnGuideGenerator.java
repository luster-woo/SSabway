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

    // 34.6°(실제로는 거의 직진으로 느껴짐)와 56.3°(확실한 회전) 사이,
    // 실사용자 피드백으로 확정한 경계값.
    private static final double STRAIGHT_THRESHOLD_DEG = 45;
    private static final double UTURN_THRESHOLD_DEG = 160;

    public enum Turn { STRAIGHT, LEFT, RIGHT, UTURN }

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

    /* 표지판 등 일반 구간. 직진이면서 손글씨 문구가 있으면 이 메서드를 타지 않는다 */
    public String plain(Turn turn, int meters, Language language) {
        return switch (turn) {
            case STRAIGHT -> switch (language) {
                case KO -> meters + "m 직진하세요";
                case EN -> "Go straight " + meters + " m";
                case JA -> meters + "m直進してください";
                case ZH -> "直行" + meters + "米";
            };
            case LEFT -> switch (language) {
                case KO -> meters + "m 이동한 뒤 왼쪽으로 꺾으세요";
                case EN -> "Walk " + meters + " m, then turn left";
                case JA -> meters + "m進んだ後、左に曲がってください";
                case ZH -> "前进" + meters + "米后左转";
            };
            case RIGHT -> switch (language) {
                case KO -> meters + "m 이동한 뒤 오른쪽으로 꺾으세요";
                case EN -> "Walk " + meters + " m, then turn right";
                case JA -> meters + "m進んだ後、右に曲がってください";
                case ZH -> "前进" + meters + "米后右转";
            };
            case UTURN -> switch (language) {
                case KO -> meters + "m 이동한 뒤 왔던 방향으로 돌아가세요";
                case EN -> "Walk " + meters + " m, then turn back";
                case JA -> meters + "m進んだ後、来た方向に戻ってください";
                case ZH -> "前进" + meters + "米后原路返回";
            };
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
        String prefix = switch (language) {
            case KO -> "계단을 내려가 ";
            case EN -> "Go down the stairs, walk ";
            case JA -> "階段を下りて";
            case ZH -> "下楼梯后前进";
        };
        return switch (turn) {
            case STRAIGHT -> switch (language) {
                case KO -> prefix + meters + "m 이동하세요";
                case EN -> prefix + meters + " m";
                case JA -> prefix + meters + "m進んでください";
                case ZH -> prefix + meters + "米";
            };
            case LEFT -> switch (language) {
                case KO -> prefix + meters + "m 이동한 뒤 왼쪽으로 꺾으세요";
                case EN -> prefix + meters + " m, then turn left";
                case JA -> prefix + meters + "m進んだ後、左に曲がってください";
                case ZH -> prefix + meters + "米后左转";
            };
            case RIGHT -> switch (language) {
                case KO -> prefix + meters + "m 이동한 뒤 오른쪽으로 꺾으세요";
                case EN -> prefix + meters + " m, then turn right";
                case JA -> prefix + meters + "m進んだ後、右に曲がってください";
                case ZH -> prefix + meters + "米后右转";
            };
            case UTURN -> switch (language) {
                case KO -> prefix + meters + "m 이동한 뒤 왔던 방향으로 돌아가세요";
                case EN -> prefix + meters + " m, then turn back";
                case JA -> prefix + meters + "m進んだ後、来た方向に戻ってください";
                case ZH -> prefix + meters + "米后原路返回";
            };
        };
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
