"""체다 답 평가 얼굴 셋 (#163). 치즈가 얼마나 신선한지로 답이 어땠는지 묻는다.

신선해요(좋았어요)는 노란 치즈에 웃는 얼굴, 애매해요는 너무 익어 갈색이 된 치즈에 멍한 얼굴,
상했어요(아쉬워요)는 초록 곰팡이가 핀 치즈에 울상이다. 색만 봐도 좋고 나쁨이 보이게 했다(2026-10-11, 표정만으로는 잘 안 보였다).

몸 모양, 외곽선, 다리, 눈과 입 위치는 cheese.py 와 같다(그 파일은 실행하면 시트 전체를 만들어서 불러 쓰지 않고 필요한 부분만 옮겼다).
결과는 28x28 칸 셋을 가로로 이은 freshness.png. public/admin/pet/ 에 넣는다

python -I scripts/pet/freshness.py public/admin/pet
"""
import os
import sys

from PIL import Image

OUT = sys.argv[1]
W = H = 28
OX, OY = 2, 3
K = (52, 38, 30)
WH = (255, 255, 255)
PK = (255, 140, 160)
BL = (110, 180, 255)

# 치즈 상태별 색: 몸, 윗면 빛, 그늘과 구멍
FRESH = dict(body=(255, 204, 62), light=(255, 232, 140), shade=(232, 152, 34))
RIPE = dict(body=(205, 150, 82), light=(228, 186, 122), shade=(158, 104, 50))
MOLDY = dict(body=(214, 205, 92), light=(232, 226, 140), shade=(170, 160, 58))
MOLD = (92, 158, 74)      # 곰팡이
MOLD_DARK = (58, 112, 52)

BODY = {0: (14, 18), 1: (11, 20), 2: (8, 21), 3: (6, 21), 4: (4, 21), 5: (3, 21), 6: (2, 21), 7: (2, 21),
        8: (2, 21), 9: (2, 21), 10: (2, 21), 11: (2, 21), 12: (3, 20), 13: (4, 19)}
HOLES = [(4, 10), (5, 10), (4, 11), (18, 9), (19, 9), (19, 10), (17, 3), (18, 3), (15, 12), (16, 12)]
# 곰팡이 얼룩(몸 좌표). 얼굴은 피한다
SPOTS = [(5, 3), (6, 3), (6, 4), (17, 6), (18, 6), (18, 7), (19, 7), (3, 8), (3, 9), (12, 12), (13, 12), (13, 11), (20, 11), (8, 2)]


def face(pal, eyes, mouth, blush=True, fx=None):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    p = img.load()

    def put(x, y, c):
        x, y = x + OX, y + OY
        if 0 <= x < W and 0 <= y < H:
            p[x, y] = c + (255,)

    top = 5
    for x in (6, 15):
        for dx in (0, 1, 2):
            for yy in (14, 15, 16):
                put(x + dx, top + yy, K)
    filled = {(x, top + r) for r, (a, b) in BODY.items() for x in range(a, b + 1)}
    for (x, y) in filled:
        put(x, y, pal["body"])
    for (x, y) in filled:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in filled:
                put(nx, ny, K)
    keys = sorted(BODY)
    for r in keys[:4]:
        a, b = BODY[r]
        nxt = BODY.get(r + 1, (a, b))
        for x in range(nxt[0], a + 2):
            if (x, top + r + 1) in filled:
                put(x, top + r + 1, pal["light"])
    last = keys[-1]
    for x in range(BODY[last][0], BODY[last][1] + 1):
        put(x, top + last, pal["shade"])
    for x, y in HOLES:
        put(x, top + y, pal["shade"])
    if fx == "mold":
        for i, (x, y) in enumerate(SPOTS):
            put(x, top + y, MOLD_DARK if i % 3 == 0 else MOLD)

    ex = [8, 13]
    ey = top + 5
    for x in ex:
        if eyes == "happy":
            put(x - 1, ey + 2, K); put(x, ey + 1, K); put(x + 1, ey + 1, K); put(x + 2, ey + 2, K)
        elif eyes == "dot":
            put(x, ey + 1, K); put(x + 1, ey + 1, K)
        elif eyes == "sad":
            put(x - 1, ey + 1, K); put(x, ey + 2, K); put(x + 1, ey + 2, K); put(x + 2, ey + 1, K)
    if blush:
        for x in (ex[0] - 2, ex[1] + 3):
            put(x, ey + 3, PK)
    mx, my = 10, ey + 4
    if mouth == "open":
        put(mx, my, K); put(mx + 3, my, K)
        for x in (mx + 1, mx + 2):
            put(x, my, PK); put(x, my + 1, K)
    elif mouth == "flat":
        put(mx + 1, my, K); put(mx + 2, my, K)
    elif mouth == "wobble":
        put(mx, my + 1, K); put(mx + 1, my, K); put(mx + 2, my + 1, K); put(mx + 3, my, K)
    if fx == "spark":
        for x, y in [(1, 1), (0, 2), (1, 2), (2, 2), (1, 3), (22, 0), (23, 1)]:
            put(x, y, pal["light"])
    if fx == "mold":
        put(ex[0], ey + 3, BL); put(ex[0], ey + 4, BL)
    if fx == "dots":
        put(17, 1, K); put(19, 1, K); put(21, 1, K)
    return img


faces = [
    face(FRESH, "happy", "open", fx="spark"),
    face(RIPE, "dot", "flat", blush=False, fx="dots"),
    face(MOLDY, "sad", "wobble", blush=False, fx="mold"),
]
sheet = Image.new("RGBA", (W * len(faces), H), (0, 0, 0, 0))
for i, f in enumerate(faces):
    sheet.alpha_composite(f, (i * W, 0))
os.makedirs(OUT, exist_ok=True)
sheet.save(os.path.join(OUT, "freshness.png"))
big = sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST)
bg = Image.new("RGBA", big.size, (247, 248, 249, 255))
bg.alpha_composite(big)
bg.save(os.path.join(OUT, "freshness-preview.png"))
print("ok", sheet.size)
