# 대구역 지도 데이터

실내 길안내에 쓰는 지도, 경로 그래프, 안내 멘트입니다.

## 파일

| 파일 | 용도 |
|---|---|
| `daegu_map.svg` | **프론트 배경 지도.** 경로선 없음 |
| `daegu_navigation.json` | **노드·엣지 그래프.** 서버 경로 탐색 + 프론트 마커 |
| `daegu_user_guide.json` | **안내 멘트.** 한국어·영어·일본어·중국어 |
| `daegu_map_with_route.svg` | 경로선까지 그린 것. 확인용 |
| `지도이미지/*.png` | 미리보기용 PNG |
| `map_editor.html` | 편집 도구 (브라우저에서 열기) |
| `map_editor_data.json` | 편집 도구 원본 데이터 |

## 좌표계

노드 좌표는 **SVG 좌표 그대로**입니다. 변환하지 마세요.

```
viewBox   0 0 6935.65 3747.6
(0,0)     왼쪽 위        y 는 아래로 갈수록 커짐
1m        26.077 단위
```

`daegu_navigation.json` 의 `svg.viewBox` 에 같은 값이 들어 있습니다. SVG 를 인라인으로 넣고 노드 좌표를 그대로 쓰면 확대·축소해도 마커가 따라붙습니다.

```html
<svg viewBox="0 0 6935.65 3747.6">
  <image href="daegu_map.svg" x="0" y="0" width="6935.65" height="3747.6"/>
  <circle cx="2383.8" cy="2903.8" r="30"/>   <!-- EV2_02 -->
</svg>
```

> `<img>` + HTML 마커로 갈 거면 컨테이너 비율을 viewBox 와 같게(약 1.85:1) 맞춰야 합니다. 안 맞으면 여백이 생기면서 마커가 통째로 어긋납니다.

## daegu_navigation.json

노드 62개(표지판 41, 엘리베이터 11, 출구 6, 게이트 4), 엣지 89개.

```json
{ "id": "EV2_02", "type": "ELEVATOR", "floor": "2", "x": 2383.8, "y": 2903.8 }
```

```json
{
  "id": "E001", "from": "S3_01", "to": "S3_02",
  "bidirectional": true,
  "containsStairs": false,
  "weight": 260.77,
  "arriveSide": { "S3_02": "F", "S3_01": "B" },
  "geometry": [ {"x": 2843.8, "y": 2643.8}, {"x": 2863.8, "y": 2383.8} ]
}
```

- `weight` — 구간 길이. `26.077` 로 나누면 미터
- `containsStairs` — 계단 포함. 계단을 못 쓰는 사용자는 이 엣지를 빼고 탐색
- `geometry` — 경로선을 그릴 좌표. 첫 점 = `from`, 끝 점 = `to`. 반대 방향이면 뒤집어 쓸 것
- `arriveSide` — **도착 노드에서 보이는 표지판 면.** 아래 참고

### arriveSide

표지판은 앞(F)·뒤(B) 두 면에 사진이 따로 있습니다. 어느 쪽에서 걸어왔느냐에 따라 보이는 면이 달라서, 엣지에 방향별 답을 적어 뒀습니다.

```java
String side = edge.arriveSide().get(nextNodeId);   // "F" / "B" / null
```

사진 경로:
```
0721_data/{층}층/{층}층/{표지판}/{표지판}_{면}/users/{표지판}_{면}_users_01.jpg
```

89개 엣지 중 76개에 값이 있습니다. 나머지는 끝이 표지판이 아니거나(엘리베이터·출구·게이트) 사진이 없는 경우라 `null` 이 나옵니다. **사진이 없어도 경로 응답은 실패시키지 마세요.**

## daegu_user_guide.json

진행 방향 178개 × 4개 언어.

```json
"E001:S3_01": {
  "from": "S3_02", "to": "S3_01",
  "pattern": "straight", "distanceM": 10,
  "text": {
    "ko": "표지판이 보이는 곳까지 10m 직진하세요",
    "en": "Go straight 10 m until the sign comes into view.",
    "ja": "案内板が見えるところまで10m直進してください。",
    "zh": "直行10米，直到看见指示牌。"
  },
  "translatedFrom": "표지판이 보이는 곳까지 10m 직진하세요"
}
```

키는 `{엣지id}:{도착노드id}` 로 `arriveSide` 와 같은 규칙입니다.

```java
String text = guide.directions().get(edge.id() + ":" + nextNodeId).text().get(lang);
```

- 언어 코드: `ko` 한국어 / `en` 영어 / `ja` 일본어 / `zh` 중국어(간체)
- `translatedFrom` — 번역할 때 쓴 한국어 원문. `text.ko` 와 다르면 번역이 낡은 것
- **좌회전·우회전은 들어 있지 않습니다.** 어느 엣지로 들어왔는지에 따라 달라져서, 서버가 이전 엣지와의 각도로 계산해 앞에 붙여야 합니다

## 알려진 제약

- **엘리베이터끼리 연결된 엣지가 없습니다.** 층 이동이 계단으로만 되어 있어, 계단을 제외하면 다른 층으로 가는 경로가 나오지 않습니다
- 출구·게이트 노드의 `floor` 가 `"0"` 입니다. 실제 층이 아니라 "전 층 통합 도면" 이라는 뜻입니다
- `daegu_navigation.json` 의 `svg.file` 값이 `daegu_map_0_only.svg` 인데 실제 파일명은 `daegu_map.svg` 입니다. 파일명은 무시하고 `viewBox` 만 쓰세요

## 데이터를 고칠 때

`map_editor.html` 을 브라우저로 열고 `📂 불러오기` → `map_editor_data.json`.

수정 후 네 개를 **모두 다시 내보내야** 합니다. 지도를 고치면 viewBox 가 바뀌므로 하나만 갱신하면 좌표가 어긋납니다.

```
💾 저장(JSON)        map_editor_data.json
🔷 SVG (지도만)      daegu_map.svg
🔷 SVG 저장          daegu_map_with_route.svg
🧭 Navigation JSON   daegu_navigation.json
```

안내 멘트는 `../guide_editor/guide_editor.html` 에서 편집합니다. 한국어를 고친 뒤에는 번역을 다시 받아야 합니다.
