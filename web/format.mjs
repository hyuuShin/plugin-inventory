export function formatDateTime(iso) {
  if (!iso) return "아직 없음";
  if (!Number.isFinite(Date.parse(iso))) return "확인 불가";
  return (
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso)) + " KST"
  );
}
export const formatNumber = (n) =>
  Number.isFinite(n) ? new Intl.NumberFormat("ko-KR").format(n) : "확인 불가";
export function freshnessStatus({ lastSuccess, now, weekly = false }) {
  if (!lastSuccess || !Number.isFinite(Date.parse(lastSuccess)))
    return "missing";
  return Date.parse(now) - Date.parse(lastSuccess) >=
    (weekly ? 9 : 2) * 86400000
    ? "stale"
    : "fresh";
}
