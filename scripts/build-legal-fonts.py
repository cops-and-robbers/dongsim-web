"""법적 문서 뷰(#47)에 쓸 Pretendard 서브셋을 만든다.

앱 웹뷰가 여는 /legal/[doc]/embed 는 사이트 레이아웃을 타지 않는다(Route Handler).
그래서 next/font 가 넣어주는 폰트를 못 쓰고, 폰트를 직접 서빙해야 한다.

Pretendard 원본은 웨이트 하나가 760KB 다. 두 웨이트면 1.5MB 인데, 약관 한 장을
띄우려고 받기에는 크다. 문서에 실제로 쓰이는 글자만 남기면 훨씬 작아진다.

문서를 고쳐서 새 글자가 생기면 이 스크립트를 다시 돌려야 한다. 안 돌리면 그 글자만
시스템 폰트로 떨어져서 한 문단 안에 서체가 섞인다. `pnpm check:legal-fonts` 가
그 상태를 잡아내니 CI 에서 걸린다.

파일 이름에는 내용 해시가 들어간다(#49). 이름이 같으면 내용도 같다는 게 보장되므로
`next.config.ts` 에서 immutable 캐시를 걸 수 있고, 그러면 앱이 약관을 열 때마다
폰트를 다시 확인하지 않는다. 어떤 이름으로 나갔는지는 manifest.json 에 적어서
embed-html.ts 가 읽어 간다.

    python scripts/build-legal-fonts.py

필요: pip install fonttools brotli
"""

from __future__ import annotations

import hashlib
import io
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "legal"
SRC = ROOT / "node_modules" / "pretendard" / "dist" / "web" / "static" / "woff2"
OUT = ROOT / "public" / "fonts" / "legal"
# 매니페스트는 서빙하지 않는다. public/fonts/legal 에는 해시가 붙은 폰트만 두어야
# 폴더 전체에 immutable 을 걸 수 있다. 이름이 고정인 파일이 섞이면 그게 박제된다.
MANIFEST = ROOT / "lib" / "legal" / "font-manifest.json"

# 앱 LegalDocumentPage 가 쓰는 두 웨이트만 만든다.
# paragraph14Semibold -> 600, tag_12(Medium) -> 500
WEIGHTS = {"Medium": 500, "SemiBold": 600}

# 문서에 없더라도 항상 포함한다.
# ASCII 는 URL·영문 상호·조문 번호에 쓰이고, 아래 기호들은 문서를 고칠 때 흔히
# 새로 들어오는 것들이라 미리 넣어 재생성 빈도를 줄인다.
ALWAYS = set(chr(c) for c in range(0x20, 0x7F)) | set(
    "·…‧∙•―—–‐※○●◦△▲▽▼□■◇◆★☆←→↑↓⇒⌜⌟「」『』〈〉《》"
    "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮"
    "㈜℃％＆＇（）～"
    "０１２３４５６７８９"
    "가나다라마바사아자차카타파하"
)


def collect_chars() -> set[str]:
    chars: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, str):
            chars.update(node)
        elif isinstance(node, list):
            for child in node:
                walk(child)
        elif isinstance(node, dict):
            for child in node.values():
                walk(child)

    files = sorted(CONTENT.glob("*/*.json"))
    if not files:
        sys.exit(f"문서를 못 찾았다: {CONTENT}")
    for path in files:
        walk(json.loads(path.read_text(encoding="utf-8")))
    return chars


def main() -> None:
    chars = collect_chars() | ALWAYS
    OUT.mkdir(parents=True, exist_ok=True)

    # 이름에 해시가 들어가면 덮어쓰기가 안 돼서 옛 파일이 남는다. public/ 은 커밋하는
    # 폴더라 한 번 개정할 때마다 죽은 파일이 영구히 쌓인다. 만들기 전에 비운다.
    for stale in OUT.glob("pretendard-*.woff2"):
        stale.unlink()

    files: dict[str, str] = {}

    with tempfile.TemporaryDirectory() as tmp:
        text_file = pathlib.Path(tmp) / "chars.txt"
        io.open(text_file, "w", encoding="utf-8").write("".join(sorted(chars)))

        for name, weight in WEIGHTS.items():
            src = SRC / f"Pretendard-{name}.woff2"
            tmp_out = pathlib.Path(tmp) / f"pretendard-{weight}.woff2"
            subprocess.run(
                [
                    "pyftsubset",
                    str(src),
                    f"--text-file={text_file}",
                    "--flavor=woff2",
                    f"--output-file={tmp_out}",
                    "--layout-features=*",
                ],
                check=True,
            )
            # 글자 집합이 아니라 만들어진 woff2 바이트를 해싱한다. Pretendard 원본
            # 버전이 올라가면 글자 집합은 그대로인데 내용은 바뀌는데, 글자 해시를
            # 쓰면 그때 이름이 안 바뀌어서 낡은 폰트가 immutable 로 박제된다.
            data = tmp_out.read_bytes()
            stamp = hashlib.sha256(data).hexdigest()[:8]
            dst = OUT / f"pretendard-{weight}.{stamp}.woff2"
            dst.write_bytes(data)
            files[str(weight)] = dst.name

            before = src.stat().st_size // 1024
            after = len(data) // 1024
            print(f"  {dst.name:34} {before:5} KB -> {after:4} KB")

    # 어떤 글자로 만들었는지 남긴다. scripts/check-legal-fonts.mjs 가 이 값과
    # 지금 문서를 비교해서, 폰트를 다시 안 만들고 문서만 고친 상태를 잡아낸다.
    # 폰트 파일을 파싱하지 않으므로 CI 에 파이썬이 없어도 검사가 돈다.
    digest = hashlib.sha256("".join(sorted(chars)).encode("utf-8")).hexdigest()
    # files 는 lib/legal/embed-html.ts 가 읽어서 @font-face 의 url 을 만든다.
    MANIFEST.write_text(
        json.dumps(
            {"hash": digest, "count": len(chars), "files": files},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(f"글자 {len(chars)}자 포함 (hash {digest[:12]})")


if __name__ == "__main__":
    main()
