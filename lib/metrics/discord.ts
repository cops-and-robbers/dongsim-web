/**
 * 디스코드 웹후크 전송 (#140).
 *
 * 웹후크 주소는 그 자체가 비밀번호다(아는 사람은 누구나 채널에 글을 쓸 수 있다).
 * 그래서 오류 메시지에 주소를 넣지 않는다.
 */

export class DiscordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscordError";
  }
}

/**
 * 보낼 본문. allowed_mentions 를 비워 두는 이유 - 게시물 캡션에 @everyone 이나
 * @here 가 들어 있으면 리포트 한 통이 팀 전체 알림이 된다. 빈 목록이면 어떤
 * 멘션도 울리지 않는다.
 */
export function webhookBody(
  content: string,
  username?: string,
): { content: string; allowed_mentions: { parse: [] }; username?: string } {
  // username 을 주면 그 메시지만 봇 이름을 바꿔 보낸다(웹후크 설정은 그대로)
  return username ? { content, allowed_mentions: { parse: [] }, username } : { content, allowed_mentions: { parse: [] } };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 한 통 보낸다. 429(너무 자주 보냄)면 디스코드가 알려 준 시간만큼 한 번 기다렸다 다시 보낸다.
 * 하루 몇 통이라 보통은 걸리지 않지만, 밀린 리포트가 한꺼번에 나가는 날을 위한 것이다.
 */
export async function sendDiscord(webhookUrl: string, content: string, opts: { username?: string } = {}): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${webhookUrl}?wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookBody(content, opts.username)),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      throw new DiscordError(`디스코드 전송 실패 (${e instanceof Error ? e.name : "unknown"})`);
    }
    if (res.ok) return;
    if (res.status === 429 && attempt === 0) {
      const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
      const wait = Math.min(Math.max(body.retry_after ?? 1, 0), 10);
      await sleep(wait * 1000);
      continue;
    }
    const text = await res.text().catch(() => "");
    throw new DiscordError(`디스코드 전송 실패 HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  throw new DiscordError("디스코드 전송 실패 (429 재시도 후에도 거절)");
}
