const config = {
  appId: 'com.newprotecvina.hrm',
  appName: 'Newprotec Vina HRM',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
