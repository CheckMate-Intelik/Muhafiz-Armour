import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';

const mapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  appJson.expo.extra?.googleMapsApiKey ||
  'YOUR_GOOGLE_MAPS_API_KEY';

const basePlugins = appJson.expo.plugins ?? [];

const config: ExpoConfig = {
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    config: {
      ...appJson.expo.ios?.config,
      googleMapsApiKey: mapsApiKey,
    },
  },
  android: {
    ...appJson.expo.android,
    config: {
      ...appJson.expo.android?.config,
      googleMaps: {
        ...appJson.expo.android?.config?.googleMaps,
        apiKey: mapsApiKey,
      },
    },
  },
  extra: {
    ...appJson.expo.extra,
    googleMapsApiKey: mapsApiKey,
  },
  plugins: [
    ...basePlugins,
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ] as ExpoConfig['plugins'],
};

export default config;
