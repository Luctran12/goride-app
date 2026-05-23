const appJson = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const uniquePermissions = (permissions = []) => Array.from(new Set(permissions));

const withGoogleMapsConfig = (expoConfig) => {
  if (!googleMapsApiKey) {
    return expoConfig;
  }

  return {
    ...expoConfig,
    ios: {
      ...expoConfig.ios,
      config: {
        ...expoConfig.ios?.config,
        googleMapsApiKey,
      },
    },
    android: {
      ...expoConfig.android,
      config: {
        ...expoConfig.android?.config,
        googleMaps: {
          ...expoConfig.android?.config?.googleMaps,
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};

module.exports = ({ config }) => {
  const expoConfig = {
    ...config,
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      permissions: uniquePermissions(appJson.expo.android?.permissions),
    },
  };

  return withGoogleMapsConfig(expoConfig);
};

