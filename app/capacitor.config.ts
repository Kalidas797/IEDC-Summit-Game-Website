import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.paperlab.admin',
  appName: 'PaperLab Admin',
  webDir: 'dist',
  server: {
    url: 'https://admin-app.vercel.app', // IMPORTANT: Replace this with your actual Vercel URL
    cleartext: true
  }
};

export default config;
