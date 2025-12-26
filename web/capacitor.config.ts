import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corestudio.app',
  appName: 'Core Studio',
  webDir: 'out',
  server: {
    // Allow loading resources from your API server
    allowNavigation: ['localhost:5000', '*.corestudio.com'],
    // Enable CORS for API calls
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
};

export default config;
