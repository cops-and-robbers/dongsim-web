import { tokenParts } from "@/lib/reviews/templates";

// 문구를 읽을 때 이름은 실제처럼 바꿔 보여 주고, 채워야 하는 자리만 눈에 띄게 한다.
export function TokenText({ body, name }: { body: string; name: string }) {
  return (
    <>
      {tokenParts(body).map((p, i) =>
        p.kind === "custom" ? (
          <span key={i} className="mx-0.5 rounded bg-accent-weak px-1 py-px text-[0.92em] font-medium text-accent">
            맞춤 문장
          </span>
        ) : p.kind === "name" ? (
          name
        ) : (
          p.text
        ),
      )}
    </>
  );
}
