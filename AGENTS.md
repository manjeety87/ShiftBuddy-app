# Expo HAS CHANGED

This app is on **Expo SDK 57** (React Native 0.86, React 19.2, expo-router 57).
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

- Never import `@react-navigation/*` — use `expo-router/js-tabs` and `expo-router/react-navigation`.
- `StyleSheet.absoluteFillObject` no longer exists in RN 0.86.
- `expo-notifications` throws on import in Android Expo Go — only load it through `lib/notifications.ts`.
