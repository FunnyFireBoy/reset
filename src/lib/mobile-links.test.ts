/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { androidAppIntent, calendarInsertIntent } from './mobile-links';

describe('mobile app handoffs', () => {
  test('Maps targets the Google Maps app with a web fallback', () => {
    const url = 'https://www.google.com/maps/search/?api=1&query=rehab%20Hyderabad';
    const intent = androidAppIntent(url, 'com.google.android.apps.maps');
    expect(intent).toContain('package=com.google.android.apps.maps;');
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent(url)};`);
    expect(intent).toStartWith('intent://www.google.com/maps/search/?api=1&query=rehab%20Hyderabad#Intent;');
  });
  test('Google Calendar receives the selected event title and exact times', () => {
    const start = new Date('2026-11-06T09:00:00+05:30');
    const end = new Date('2026-11-06T09:30:00+05:30');
    const intent = calendarInsertIntent('Focus & recover', 'A healthy step', start, end, 'https://calendar.google.com/', 'com.google.android.calendar');
    expect(intent).toContain('action=android.intent.action.INSERT;');
    expect(intent).toContain('package=com.google.android.calendar;');
    expect(intent).toContain('S.title=Focus%20%26%20recover;');
    expect(intent).toContain('l.beginTime=1793935800000;l.endTime=1793937600000;');
  });
  test('Device calendar allows the phone to choose its default app', () => {
    const intent = calendarInsertIntent('Quest', '', new Date(1000), new Date(1801000), 'https://calendar.google.com/');
    expect(intent).not.toContain('package=');
    expect(intent).toContain('scheme=content;');
    expect(intent).toContain('type=vnd.android.cursor.item/event;');
  });
});