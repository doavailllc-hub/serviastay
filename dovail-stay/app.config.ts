import type { ExpoConfig, ConfigContext } from "expo/config";

import appJson from "./app.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const base = { ...config, ...appJson.expo } as ExpoConfig;

  return {
    ...base,
    android: {
      ...base.android,
      ...(googleMapsApiKey
        ? { config: { googleMaps: { apiKey: googleMapsApiKey } } }
        : {}),
    },
  };
};
