import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.reset',
  appName: 'RESET',
  webDir: 'dist/client',
  server: {
    url: 'https://resetapprecovery.lovable.app',
    cleartext: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#44A96C',
    },
  },
};

export default config;
