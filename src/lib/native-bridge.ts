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

/**
 * Schedule a daily reminder
 */
export const scheduleDailyReminder = async (hour: number, minute: number, title: string, body: string) => {
  if (isNative) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: 101, // Constant ID for daily reminder
          schedule: {
            allowWhileIdle: true,
            on: {
              hour,
              minute,
            },
          },
        },
      ],
    });
    return true;
  }
  return false;
};
