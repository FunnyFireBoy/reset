import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Browser } from '@capacitor/browser';
import { AppLauncher } from '@capacitor/app-launcher';
import { androidAppIntent, calendarInsertIntent } from './mobile-links';
import { requestWebNotifications, showWebNotification, webNotificationPermission } from './web-notifications';

const CalendarHandoff = registerPlugin<{
  openEvent(options: { title: string; description: string; start: number; end: number; google: boolean }): Promise<{ completed: boolean }>;
}>('CalendarHandoff');

export const isNative = Capacitor.isNativePlatform();

/**
 * Handle local notifications with native support
 */
export const nativeNotify = async (title: string, body: string, id?: number) => {
  if (isNative) {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: id ?? Math.floor(Math.random() * 1000000),
          schedule: { at: new Date(Date.now() + 1000) },
        },
      ],
    });
  } else {
    await showWebNotification(title, body);
  }
};

export const requestNotificationPermission = async () => {
  if (isNative) {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  }
  return requestWebNotifications();
};

export const notificationsAllowed = async () => {
  if (isNative) return (await LocalNotifications.checkPermissions()).display === 'granted';
  return webNotificationPermission() === 'granted';
};

/**
 * Open maps natively or in browser
 */
export const openMap = async (query: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  if (isNative) {
    try {
      const opened = await AppLauncher.openUrl({ url: Capacitor.getPlatform() === 'android' ? `geo:0,0?q=${encodeURIComponent(query)}` : url });
      if (opened.completed) return;
    } catch { /* Browser fallback when no Maps app is available. */ }
    await Browser.open({ url });
  } else if (/Android/i.test(navigator.userAgent)) {
    window.location.assign(androidAppIntent(url, 'com.google.android.apps.maps'));
  } else {
    window.location.assign(url);
  }
};

/**
 * Open calendar event natively or in browser
 */
export const openCalendar = async (url: string, title?: string, description = '', start?: Date, end?: Date) => {
  if (title && start && end) {
    if (isNative && Capacitor.getPlatform() === 'android') {
      const opened = await CalendarHandoff.openEvent({ title, description, start: start.getTime(), end: end.getTime(), google: true });
      if (opened.completed) return;
    } else if (/Android/i.test(navigator.userAgent)) {
      window.location.assign(calendarInsertIntent(title, description, start, end, url, 'com.google.android.calendar'));
      return;
    }
  }
  if (isNative) await Browser.open({ url });
  else window.location.assign(url);
};

export const openDefaultCalendar = async (title: string, description: string, start: Date, end: Date, fallbackUrl: string) => {
  if (isNative && Capacitor.getPlatform() === 'android') {
    const opened = await CalendarHandoff.openEvent({ title, description, start: start.getTime(), end: end.getTime(), google: false });
    if (opened.completed) return;
  } else if (/Android/i.test(navigator.userAgent)) {
    // Use an HTTPS fallback; browsers refuse data URLs inside intent fallbacks.
    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.search = new URLSearchParams({ action: 'TEMPLATE', text: title, details: description,
      dates: `${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z` }).toString();
    window.location.assign(calendarInsertIntent(title, description, start, end, googleUrl.href));
    return;
  }
  // Calendar files are the supported handoff on iOS and desktop; the OS chooses the calendar app.
  const link = document.createElement('a');
  link.href = fallbackUrl;
  link.download = 'RESET-quest.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Schedule a daily reminder
 */
const REMINDER_MESSAGES = [
  'Your next win starts with one honest check-in.',
  'A small recovery quest today can protect the progress you have built.',
  'You do not need a perfect day—just your next healthy choice.',
  'Your streak is proof that repeated small choices matter.',
  'Open RESET and choose one quest you can finish today.',
  'Checking in keeps your recovery visible and your momentum real.',
  'A new day means a fresh set of chances. Come see today’s quests.',
];

export const scheduleDailyReminder = async (hour: number, minute: number) => {
  if (isNative) {
    const allowed = await requestNotificationPermission();
    if (!allowed) return false;
    await LocalNotifications.cancel({ notifications: REMINDER_MESSAGES.map((_, index) => ({ id: 7100 + index })) });
    await LocalNotifications.schedule({
      notifications: REMINDER_MESSAGES.map((body, index) => ({
        title: 'RESET · Your recovery matters',
        body,
        id: 7100 + index,
        schedule: { allowWhileIdle: true, on: { weekday: index + 1, hour, minute } },
      })),
    });
    return true;
  }
  return false;
};

export const cancelDailyReminder = async () => {
  if (!isNative) return;
  await LocalNotifications.cancel({ notifications: REMINDER_MESSAGES.map((_, index) => ({ id: 7100 + index })) });
};
