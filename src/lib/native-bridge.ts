import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Browser } from '@capacitor/browser';
import { AppLauncher } from '@capacitor/app-launcher';

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
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.png' });
  }
};

export const requestNotificationPermission = async () => {
  if (isNative) {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
};

/**
 * Open maps natively or in browser
 */
export const openMap = async (query: string) => {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  if (isNative) {
    // Try to open geo URI or maps app
    const canOpen = await AppLauncher.canOpenUrl({ url: 'geo:0,0?q=' + encodeURIComponent(query) });
    if (canOpen.value) {
      await AppLauncher.openUrl({ url: 'geo:0,0?q=' + encodeURIComponent(query) });
    } else {
      await Browser.open({ url });
    }
  } else {
    window.open(url, '_blank');
  }
};

/**
 * Open calendar event natively or in browser
 */
export const openCalendar = async (url: string) => {
  if (isNative) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
};

export const openDefaultCalendar = async (title: string, description: string, start: Date, end: Date, fallbackUrl: string) => {
  if (isNative && Capacitor.getPlatform() === 'android') {
    const intent = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.item/event;S.title=${encodeURIComponent(title)};S.description=${encodeURIComponent(description)};l.beginTime=${start.getTime()};l.endTime=${end.getTime()};end`;
    const available = await AppLauncher.canOpenUrl({ url: intent });
    if (available.value) {
      await AppLauncher.openUrl({ url: intent });
      return;
    }
  }
  window.location.href = fallbackUrl;
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
