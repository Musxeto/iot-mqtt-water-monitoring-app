# tanzeem ul tyari — Smart Water Monitoring (IoT)

A water-themed React Native + Expo app for monitoring IoT sensor data (water level, temperature, turbidity, etc.) streamed over MQTT and stored in Firebase/Firestore. The app includes a Dashboard, Analytics (graphs), and Settings for configuring the MQTT broker.

This repository was built with Expo and designed for quick prototyping and deployment with an Expo-managed workflow.

## Key features

- Real-time MQTT client (paho-mqtt) with configurable broker (Settings screen)
- Firestore persistence and anonymous authentication
- Dashboard with sensor cards and connection status
- Analytics tab with interactive charts (react-native-chart-kit)
- Water-themed UI with modern icons (Ionicons / @expo/vector-icons)
- Persistent MQTT config using AsyncStorage

## Status

- Platform: Expo (managed)
- Expo SDK: ~54.0.29
- React Native: 0.81.5
- This README was generated on Dec 14, 2025. Update as needed.

## Project structure (top-level)

- `app/` — Expo Router app routes and screens
  - `(tabs)/` — Tab screens: Dashboard (`index.tsx`), Analytics (`analytics.tsx`), Settings (`settings.tsx`)
- `components/` — Reusable UI components
- `config/` — App configuration helpers (e.g. `firebase.ts`, `mqtt.ts`)
- `constants/` — Theme and color constants
- `services/` — Firestore and backend helpers
- `assets/` — Images and icons
- `scripts/` — Utility scripts (e.g. `reset-project.js`)
- `package.json` — scripts and dependencies

## Prerequisites

- Node.js (recommended LTS) and npm or yarn
- Expo CLI (optional, but helpful): `npm install -g expo-cli`
- An Expo-compatible device/emulator or Expo Go app for quick testing
- A Firebase project (Firestore) if you want to use your own backend

## Quick setup

1. Install dependencies

```bash
npm install
# or
# yarn
```

2. Start the dev server

```bash
npm start
# or
# npm run android
# npm run ios
# npm run web
```

3. Open the app in Expo Go (scan QR) or run on an emulator/device.

## Firebase configuration

A default Firebase web config exists in `config/firebase.ts`. It initializes Firebase and signs in anonymously so Firestore rules that require auth will work out of the box.

If you'd like to use your own Firebase project, replace the `firebaseConfig` object in `config/firebase.ts` with your project's values (or wire environment variables as you prefer):

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

Note: The repo currently contains a Firebase configuration for an example project. For production use, move keys to environment variables or a secure secrets manager and do not commit them to source control.

## MQTT broker configuration

You can configure the MQTT broker used by the app two ways:

- In-app: Open the Settings tab in the app and edit the hostname, port, and path for the MQTT WebSocket connection. Changes are persisted to AsyncStorage.
- Static: Edit `config/mqtt.ts` to change defaults.

Default example: HiveMQ public broker (WebSocket) — `broker.hivemq.com:8000` (configurable in Settings).

## Charts / Analytics

The Analytics screen uses `react-native-chart-kit` for line charts and requires `react-native-svg`. These dependencies are listed in `package.json`.

If you run on web or in environments where charts don't render, ensure `react-native-svg` is available and properly linked for the platform.

## Important development notes

- Safe area handling: screens use `react-native-safe-area-context` and `useSafeAreaInsets()` to ensure the bottom tab bar is accessible on devices with insets.
- React Native Reanimated and gesture-handler are included in `package.json`. Follow their installation instructions if you see warnings (especially for native builds).

## Useful scripts (from `package.json`)

- `npm start` — Start Expo dev server
- `npm run android` — Start and open Android
- `npm run ios` — Start and open on iOS
- `npm run web` — Start and open on web
- `npm run reset-project` — Run `scripts/reset-project.js` (project reset helper)
- `npm run lint` — Run Expo/ESLint

## Troubleshooting

- Firebase auth errors: Check `config/firebase.ts` and ensure your API key and project values are valid. Check console output for specific errors.
- MQTT connection issues: Verify the hostname, port, and path in Settings. If using a local broker, ensure WebSocket support is enabled and reachable from the device.
- Charts not rendering: Ensure `react-native-svg` is installed correctly. On web, you may need additional configuration for `svgs`.
- Reanimated issues: If you see Reanimated warnings on start, follow the official Reanimated installation and add the Babel plugin as required for the React Native version.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Open a pull request with a clear description

Please run tests and linting (where appropriate) before submitting a PR.

## License

No license file is included in this repository. Add a `LICENSE` file (MIT, Apache, etc.) if you want to set a license. Example MIT header:

```
MIT License

Copyright (c) 2025 <Your Name>

Permission is hereby granted, free of charge, to any person obtaining a copy
...
```

## Acknowledgements

- Expo and the React Native community
- Firebase (Firestore)
- paho-mqtt for MQTT over WebSockets
- react-native-chart-kit and react-native-svg for charts

## Contact

If you have questions or want help extending this project, open an issue or contact the repository owner.


---

README generated and added to the repo. Update any project-specific values (Firebase credentials, broker defaults, license) before publishing.
