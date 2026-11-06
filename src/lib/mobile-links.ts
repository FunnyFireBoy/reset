export function androidAppIntent(url: string, packageName: string) {
  const parsed = new URL(url);
  return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=${parsed.protocol.slice(0, -1)};package=${packageName};S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

export function calendarInsertIntent(title: string, description: string, start: Date, end: Date, fallbackUrl: string, packageName?: string) {
  return `intent://com.android.calendar/events#Intent;scheme=content;action=android.intent.action.INSERT;type=vnd.android.cursor.item/event;${packageName ? `package=${packageName};` : ""}S.title=${encodeURIComponent(title)};S.description=${encodeURIComponent(description)};l.beginTime=${start.getTime()};l.endTime=${end.getTime()};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}