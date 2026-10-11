"""치즈 조각 펫 (지표 챗봇 도우미, #163). 28x28 칸, 7색. 코드로 그린다.
결과(cheese-sheet.png, .json)는 public/admin/pet/ 에 넣는다. 화면은 components/admin/pet/CheesePet.tsx, 판단은 lib/admin/pet/brain.ts

프레임 하나 = 부품 조합: 몸 위치(dy), 눌림(squash), 눈, 입, 시선(look), 다리, 작은 팔, 기호, 회전.
같은 부품만 움직이므로 모든 프레임에서 모양과 색이 똑같다.

python -I cheese2.py <출력폴더>
  -> cheese-sheet.png (24px 칸, 줄 = 동작), cheese-sheet.json (동작별 줄, 프레임 수, 프레임 시간)
     preview.png (8배, 동작 이름 붙임), gif/<동작>.gif
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
os.makedirs(os.path.join(OUT, "gif"), exist_ok=True)
W = H = 28
OX, OY = 2, 3  # 몸 그림(24칸 기준 좌표)을 28칸 안에 놓는 자리. 팔과 기호가 몸 밖으로 나갈 여유

K = (52, 38, 30)        # 외곽선, 눈, 입
Y = (255, 204, 62)      # 치즈
L = (255, 232, 140)     # 윗면 빛
S = (232, 152, 34)      # 그늘, 구멍
WH = (255, 255, 255)
PK = (255, 140, 160)    # 볼, 하트
BL = (110, 180, 255)    # 땀, 눈물

# 둥근 쐐기: 왼쪽이 낮고 오른쪽이 높다. 줄마다 (시작 x, 끝 x)
BODY = {0: (14, 18), 1: (11, 20), 2: (8, 21), 3: (6, 21), 4: (4, 21), 5: (3, 21), 6: (2, 21), 7: (2, 21),
        8: (2, 21), 9: (2, 21), 10: (2, 21), 11: (2, 21), 12: (3, 20), 13: (4, 19)}
HOLES = [(4, 10), (5, 10), (4, 11), (18, 9), (19, 9), (19, 10), (17, 3), (18, 3), (15, 12), (16, 12)]


def make(f):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    p = img.load()

    def put(x, y, c):
        x, y = x + OX, y + OY
        if 0 <= x < W and 0 <= y < H:
            p[x, y] = c + (255,)

    dy = f.get("dy", 0)
    top = 5 + dy
    look = f.get("look", 0)
    rows = dict(BODY)
    if f.get("squash"):  # 납작: 한 줄 낮고 양옆으로 1px
        rows = {r + 1: (a - 1, b + 1) for r, (a, b) in BODY.items() if r != 0}
    if f.get("stretch"):  # 늘어남: 위로 1줄
        rows = {(r - 1 if r < 7 else r): ab for r, ab in BODY.items()}
        rows[6] = BODY[6]

    # 다리
    legs = f.get("legs", "stand")
    leg = {"stand": [(6, 0), (15, 0)], "a": [(4, 0), (16, -1)], "b": [(7, -1), (13, 0)],
           "tuck": [], "kick": [(5, -1), (16, -1)], "sit": [(4, -2), (17, -2)]}[legs]
    for x, l in leg:
        for dx in (0, 1, 2):
            for yy in (14, 15, 16):
                put(x + dx, top + yy + l, K)
    # 몸
    for r, (a, b) in rows.items():
        for x in range(a, b + 1):
            put(x, top + r, Y)
    # 외곽선: 몸 둘레
    filled = {(x, top + r) for r, (a, b) in rows.items() for x in range(a, b + 1)}
    for (x, y) in filled:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in filled:
                put(nx, ny, K)
    # 윗면 빛 (경사면 바로 아래 한 줄) 과 아래 그늘
    keys = sorted(rows)
    for r in keys[:4]:
        a, b = rows[r]
        nxt = rows.get(r + 1, (a, b))
        for x in range(nxt[0], a + 2):
            if (x, top + r + 1) in filled:
                put(x, top + r + 1, L)
    last = keys[-1]
    for x in range(rows[last][0], rows[last][1] + 1):
        put(x, top + last, S)
    # 구멍
    for x, y in HOLES:
        if (x, top + y) in filled:
            put(x, top + y, S)
    # 작은 팔: 노란 2x2 에 외곽선. 몸 밖(오른쪽, 왼쪽)에 붙는다
    def nub(x, y):
        for dx in (-1, 0, 1, 2):
            for dyy in (-1, 0, 1, 2):
                if dx in (0, 1) and dyy in (0, 1):
                    put(x + dx, y + dyy, Y)
                elif not (dx in (-1, 2) and dyy in (-1, 2)):
                    put(x + dx, y + dyy, K)
    arm = f.get("arm")
    if arm == "wave":
        nub(23, top + 3)
    elif arm == "wave2":
        nub(23, top + 6)
    elif arm == "up":
        nub(-1, top + 3); nub(23, top + 3)

    # 얼굴
    ex = [8 + look, 13 + look]
    ey = top + 5
    eyes = f.get("eyes", "open")
    for x in ex:
        if eyes == "open":
            for yy in (0, 1, 2):
                put(x, ey + yy, K); put(x + 1, ey + yy, K)
            put(x + 1, ey, WH)
        elif eyes == "wide":  # 놀람: 크게 뜨고 반짝 두 개
            for yy in (-1, 0, 1, 2):
                put(x, ey + yy, K); put(x + 1, ey + yy, K)
            put(x + 1, ey - 1, WH); put(x, ey + 1, WH)
        elif eyes == "closed":
            for dx in (-1, 0, 1, 2):
                put(x + dx, ey + 2, K)
        elif eyes == "happy":  # ^ ^
            put(x - 1, ey + 2, K); put(x, ey + 1, K); put(x + 1, ey + 1, K); put(x + 2, ey + 2, K)
        elif eyes == "sad":  # 처진 눈
            put(x - 1, ey + 1, K); put(x, ey + 2, K); put(x + 1, ey + 2, K); put(x + 2, ey + 1, K)
        elif eyes == "dot":  # 멍, 갸웃
            put(x, ey + 1, K); put(x + 1, ey + 1, K)
        elif eyes == "heart":
            for dx, dyy in [(-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (2, 1), (0, 2), (1, 2)]:
                put(x + dx, ey + dyy, PK)
            put(x - 1, ey - 0, K)
        elif eyes == "x":  # 넘어졌을 때
            put(x - 1, ey, K); put(x + 2, ey, K); put(x, ey + 1, K); put(x + 1, ey + 1, K); put(x - 1, ey + 2, K); put(x + 2, ey + 2, K)
    # 볼
    if f.get("blush", True):
        for x in (ex[0] - 2, ex[1] + 3):
            put(x, ey + 3, PK)
    # 입
    mx, my = 10 + look, ey + 4
    mouth = f.get("mouth", "smile")
    if mouth == "smile":
        put(mx, my, K); put(mx + 1, my + 1, K); put(mx + 2, my + 1, K); put(mx + 3, my, K)
    elif mouth == "open":  # 활짝
        put(mx, my, K); put(mx + 3, my, K)
        for x in (mx + 1, mx + 2):
            put(x, my, PK); put(x, my + 1, K)
    elif mouth == "o":
        put(mx + 1, my, K); put(mx + 2, my, K); put(mx + 1, my + 1, K); put(mx + 2, my + 1, K)
    elif mouth == "flat":
        put(mx + 1, my, K); put(mx + 2, my, K)
    elif mouth == "wobble":
        put(mx, my + 1, K); put(mx + 1, my, K); put(mx + 2, my + 1, K); put(mx + 3, my, K)
    elif mouth == "sniff":  # 킁킁: 작게 오므림
        put(mx + 1, my, K)

    # 기호 (글자 없이)
    fx = f.get("fx")
    if fx == "dots1":
        put(19, 1, K)
    elif fx == "dots2":
        put(17, 1, K); put(19, 1, K)
    elif fx == "dots3":
        put(17, 1, K); put(19, 1, K); put(21, 1, K)
    elif fx == "sweat":
        for x, y in [(22, top + 1), (22, top + 2), (21, top + 2), (22, top + 3)]:
            put(x, y, BL)
    elif fx == "tear":
        put(ex[0], ey + 3, BL); put(ex[0], ey + 4, BL)
    elif fx in ("z1", "z2"):
        o = 0 if fx == "z1" else 1
        for x, y in [(18, 0), (19, 0), (20, 0), (21, 0), (20, 1), (19, 2), (18, 3), (19, 3), (20, 3), (21, 3)]:
            put(x + o, y + o - 2, K)
    elif fx in ("spark1", "spark2"):
        pts = [(2, 2), (1, 3), (2, 3), (3, 3), (2, 4), (21, 1), (22, 2)] if fx == "spark1" else [(1, 1), (22, 3), (21, 4), (22, 4), (23, 4), (22, 5)]
        for x, y in pts:
            put(x, y, L if fx == "spark1" else S)
    elif fx in ("heart1", "heart2"):
        oy = 2 if fx == "heart1" else 0
        for x, y in [(18, 1), (19, 1), (21, 1), (22, 1), (17, 2), (18, 2), (19, 2), (20, 2), (21, 2), (22, 2), (23, 2), (18, 3), (19, 3), (20, 3), (21, 3), (22, 3), (19, 4), (20, 4), (21, 4), (20, 5)]:
            put(x, y + oy, PK)
    elif fx == "bang":  # 느낌표 모양 (막대와 점)
        for y in (0, 1, 2):
            put(20, y, K)
        put(20, 4, K)
    elif fx in ("stars1", "stars2"):  # 어지러움: 머리 위를 도는 작은 별
        pts = [(6, top - 3), (11, top - 5), (16, top - 3)] if fx == "stars1" else [(8, top - 5), (13, top - 3), (18, top - 5)]
        for x, y in pts:
            for dx, dyy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
                put(x + dx, y + dyy, S if (dx, dyy) != (0, 0) else L)
    elif fx == "smell":  # 냄새 물결
        for x, y in [(0, top + 2), (1, top + 1), (0, top + 0)]:
            put(x, y, S)

    # 기울이기: 돌리면 픽셀 계단이 깨진다(2026-10-09 시안). 윗부분 줄만 한 칸 밀어 기울어 보이게 한다
    lean = f.get("lean", 0)
    if lean:
        cut = OY + top + 7
        upper = img.crop((0, 0, W, cut))
        lower = img.crop((0, cut, W, H))
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        img.alpha_composite(upper, (lean, 0))
        img.alpha_composite(lower, (0, cut))
    rot = f.get("rot", 0)  # 90 의 배수만 (픽셀이 그대로 남는다)
    if rot:
        img = img.rotate(rot, resample=Image.NEAREST)
    if f.get("flip"):
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    return img


# 동작: 이름, 프레임 시간(ms), 반복 여부, 프레임들. 사용자 행동과의 연결은 cheese-sheet.json 의 "when" 에 적는다
A = lambda **k: k
STATES = [
    ("idle", "대기", 260, True, "평소", [A(), A(dy=1), A(), A(eyes="closed")]),
    ("walk", "걷기", 140, True, "마우스를 따라갈 때 (그림은 왼쪽을 본다. 오른쪽으로 갈 때 좌우 반전)", [A(legs="a"), A(dy=-1), A(legs="b"), A(dy=-1)]),
    ("run", "달리기", 90, True, "마우스가 멀리 있을 때", [A(legs="kick", dy=-1, mouth="open", look=-1), A(legs="a", look=-1, mouth="open"), A(legs="kick", dy=-2, mouth="open", look=-1), A(legs="b", look=-1, mouth="open")]),
    ("listen", "귀 기울이기", 220, True, "챗봇 입력창에 글을 쓰는 동안", [A(look=-1, mouth="o"), A(look=-1, mouth="o", dy=1), A(look=-1, mouth="smile"), A(look=-1, mouth="o", eyes="closed")]),
    ("think", "생각", 260, True, "질문을 보내고 답을 기다릴 때", [A(look=-1, mouth="flat", fx="dots1"), A(look=-1, mouth="flat", fx="dots2"), A(look=1, mouth="flat", fx="dots3"), A(look=1, mouth="flat", fx="dots3", eyes="closed")]),
    ("sniff", "킁킁", 180, True, "답을 찾는 중(생각과 번갈아)", [A(mouth="sniff", eyes="closed", fx="smell"), A(mouth="sniff", eyes="closed", dy=1), A(mouth="sniff", eyes="closed", fx="smell"), A(mouth="sniff", eyes="open", look=1)]),
    ("happy", "기쁨", 120, False, "검증을 다 통과한 답이 왔을 때", [A(squash=True, eyes="happy", mouth="open"), A(stretch=True, dy=-3, eyes="happy", mouth="open", fx="spark1", legs="tuck"), A(dy=-4, eyes="happy", mouth="open", fx="spark2", legs="tuck", arm="up"), A(squash=True, eyes="happy", mouth="open")]),
    ("confused", "갸웃", 240, True, "답에 '숫자를 확인하지 못했어요'가 있을 때", [A(eyes="dot", mouth="wobble", fx="sweat", lean=-1, look=-1), A(eyes="dot", mouth="wobble", fx="sweat", lean=-1, look=-1, dy=1), A(eyes="dot", mouth="flat", fx="sweat"), A(eyes="dot", mouth="wobble", fx="sweat", lean=1, look=1)]),
    ("fall", "꽈당", 150, False, "오류가 났을 때", [A(eyes="wide", mouth="o", lean=1, legs="a"), A(eyes="wide", mouth="o", lean=2, legs="kick", fx="sweat"), A(eyes="x", mouth="o", squash=True, dy=2, legs="tuck", fx="stars1"), A(eyes="x", mouth="flat", squash=True, dy=2, legs="tuck", fx="stars2"), A(eyes="dot", mouth="wobble", dy=1, fx="stars1"), A(eyes="closed", mouth="smile", stretch=True, dy=-1), A(eyes="open", mouth="smile")]),
    ("love", "하트", 160, False, "'도움이 됐어요'를 눌렀을 때, 펫을 클릭했을 때", [A(eyes="heart", mouth="open", fx="heart1"), A(eyes="heart", mouth="open", fx="heart2", dy=-2), A(eyes="heart", mouth="open", fx="heart2", dy=-1), A(eyes="happy", mouth="smile")]),
    ("sad", "시무룩", 260, False, "'아니에요'를 눌렀을 때", [A(eyes="sad", mouth="flat", dy=1), A(eyes="sad", mouth="wobble", dy=1, fx="tear"), A(eyes="sad", mouth="wobble", dy=1, fx="tear"), A(eyes="open", mouth="smile")]),
    ("surprise", "깜짝", 110, False, "마우스가 갑자기 가까이 왔을 때", [A(eyes="wide", mouth="o", stretch=True, dy=-2, fx="bang"), A(eyes="wide", mouth="o", dy=-1, fx="bang"), A(eyes="open", mouth="o"), A(eyes="open", mouth="smile")]),
    ("wave", "손 흔들기", 180, False, "화면에 처음 나타날 때, 탭을 옮겼을 때", [A(arm="wave", eyes="happy", mouth="open"), A(arm="wave2", eyes="happy", mouth="open"), A(arm="wave", eyes="happy", mouth="open"), A(arm="wave2", eyes="open", mouth="smile")]),
    ("squish", "꾹", 100, False, "펫을 누르고 있을 때", [A(squash=True, eyes="closed", mouth="wobble"), A(squash=True, eyes="closed", mouth="wobble", dy=1), A(eyes="wide", mouth="o", dy=-1), A()]),
    ("sit", "앉아 쉬기", 400, True, "30초 동안 아무것도 안 할 때", [A(legs="tuck", dy=3, squash=True), A(legs="tuck", dy=3, squash=True, eyes="closed"), A(legs="tuck", dy=3, squash=True, look=-1), A(legs="tuck", dy=3, squash=True, look=1)]),
    ("sleep", "졸기", 420, True, "2분 동안 아무것도 안 할 때", [A(legs="tuck", dy=3, squash=True, eyes="closed", mouth="flat"), A(legs="tuck", dy=3, squash=True, eyes="closed", mouth="o", fx="z1"), A(legs="tuck", dy=4, squash=True, eyes="closed", mouth="o", fx="z2"), A(legs="tuck", dy=3, squash=True, eyes="closed", mouth="flat")]),
    ("lift", "들림", 130, True, "꾹 눌러서 옮기는 동안", [A(eyes="wide", mouth="o", legs="a", lean=-1), A(eyes="happy", mouth="open", legs="b", lean=1), A(eyes="wide", mouth="o", legs="kick", lean=-1), A(eyes="happy", mouth="open", legs="b", lean=1)]),
    ("land", "착지", 110, False, "옮기다 놓았을 때", [A(squash=True, eyes="closed", mouth="o"), A(squash=True, dy=1, eyes="closed", mouth="wobble"), A(stretch=True, dy=-1, eyes="wide", mouth="o"), A(eyes="happy", mouth="smile")]),
    ("wake", "깨기", 140, False, "졸다가 마우스가 움직이면", [A(legs="tuck", dy=3, squash=True, eyes="closed"), A(legs="tuck", dy=2, eyes="wide", mouth="o", fx="bang"), A(stretch=True, dy=-1, eyes="open", mouth="o"), A(eyes="open", mouth="smile")]),
]

BOX = (176, 122, 69)     # 상자
TAPE = (222, 172, 106)   # 테이프, 윗면


def make_box(peek):
    """증거물 보관함. peek 이면 치즈가 뚜껑 위로 빼꼼 나와 잔다(peek 은 프레임 번호)"""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    p = img.load()

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            p[x, y] = c + (255,)
    x0, x1, y0, y1 = 3, 24, 13, 26
    if peek is not None:
        # 뚜껑 위로 치즈 윗부분: 몸 그림의 위쪽만 잘라 붙인다
        c = make(A(eyes="closed", mouth="flat", legs="tuck", dy=-1, fx="z1" if peek % 2 == 0 else "z2"))
        # 감은 눈까지 보이게 위로 뺀다(처음엔 얼굴이 상자에 가려 치즈 윗면만 보였다)
        top = c.crop((0, 3, W, 16))
        img.alpha_composite(top, (0, 0 if peek % 2 == 0 else 1))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (y0, y1)
            put(x, y, K if edge else BOX)
    for x in range(x0 + 1, x1):  # 뚜껑 띠
        put(x, y0 + 1, TAPE); put(x, y0 + 2, TAPE)
    put(x0 + 1, y0 + 3, K); put(x1 - 1, y0 + 3, K)
    for x in range(x0, x1 + 1):
        put(x, y0 + 3, K)
    for y in range(y0 + 4, y1):  # 가운데 테이프
        put(12, y, TAPE); put(13, y, TAPE); put(14, y, TAPE)
    for x, y in [(6, 18), (7, 18), (8, 18), (6, 20), (7, 20)]:  # 표식 (글자 없이 줄 두 개)
        put(x, y, K)
    return img


STATES.append(("box", "보관함", 1000, True, "비어 있는 증거물 보관함", ["BOX:None"]))
STATES.append(("boxed", "보관함 속", 600, True, "보관함에 넣어 두었을 때 (따라다니지 않는다)", ["BOX:0", "BOX:1"]))

_make = make


def make(f):  # noqa: F811 보관함 프레임은 문자열로 표시한다
    if isinstance(f, str) and f.startswith("BOX:"):
        v = f[4:]
        return make_box(None if v == "None" else int(v))
    return _make(f)


cols = max(len(fr) for *_, fr in STATES)
sheet = Image.new("RGBA", (cols * W, len(STATES) * H), (0, 0, 0, 0))
meta = {"cell": [W, H], "states": {}}
for r, (key, name, ms, loop, when, frames) in enumerate(STATES):
    imgs = [make(f) for f in frames]
    for c, im in enumerate(imgs):
        sheet.alpha_composite(im, (c * W, r * H))
    meta["states"][key] = {"row": r, "frames": len(imgs), "ms": ms, "loop": loop, "name": name, "when": when}
    big = [Image.new("RGBA", (W * 8, H * 8), (247, 248, 249, 255)) for _ in imgs]
    for b, im in zip(big, imgs):
        b.alpha_composite(im.resize((W * 8, H * 8), Image.NEAREST))
    seq = big * (3 if loop else 1) + ([big[-1]] * 3 if not loop else [])
    seq[0].save(os.path.join(OUT, "gif", f"{key}.gif"), save_all=True, append_images=seq[1:], duration=ms, loop=0)
sheet.save(os.path.join(OUT, "cheese-sheet.png"))
json.dump(meta, open(os.path.join(OUT, "cheese-sheet.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# 미리보기: 8배, 줄마다 동작 이름과 언제 나오는지
S_ = 6
font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
small = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 15)
LW = 330
prev = Image.new("RGBA", (LW + cols * W * S_, len(STATES) * H * S_), (247, 248, 249, 255))
d = ImageDraw.Draw(prev)
for r, (key, name, ms, loop, when, frames) in enumerate(STATES):
    y = r * H * S_
    d.text((16, y + 30), name, fill=(30, 30, 30), font=font)
    d.text((16, y + 64), when[:24], fill=(110, 110, 110), font=small)
    if len(when) > 24:
        d.text((16, y + 84), when[24:48], fill=(110, 110, 110), font=small)
    for c in range(len(frames)):
        im = sheet.crop((c * W, r * H, (c + 1) * W, (r + 1) * H)).resize((W * S_, H * S_), Image.NEAREST)
        prev.alpha_composite(im, (LW + c * W * S_, y))
    d.line([(0, y + H * S_ - 1), (prev.width, y + H * S_ - 1)], fill=(225, 228, 232))
prev.save(os.path.join(OUT, "preview.png"))
print(len(STATES), "states")
