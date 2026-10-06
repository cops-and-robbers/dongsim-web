/**
 * 수집 라우트의 시크릿 확인 (#140, #142). 헤더로만 받는다 - 쿼리 스트링은
 * 접속 로그와 리퍼러로 샌다. 블로그 동기화와 같은 방식이다.
 */
export function authorizedCron(req: Request): boolean {
  const secret = process.env.METRICS_CRON_SECRET;
  if (!secret) return false;
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return fromHeader === secret;
}
