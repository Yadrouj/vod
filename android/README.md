# Ramagh Android WebView

This is a native Android shell for the Next.js app. It keeps the web app as the source of truth and loads it inside a full-screen WebView with a branded loading screen.

## Development URL

By default the debug app opens:

```text
http://10.0.2.2:3001
```

That address lets the Android emulator reach the Next.js server running on your Windows host at `localhost:3001`.

For a real phone on the same Wi-Fi, change `WEBVIEW_URL` in `app/build.gradle` to your computer LAN IP, for example:

```gradle
buildConfigField "String", "WEBVIEW_URL", "\"http://192.168.1.20:3001\""
```

For production, replace it with your HTTPS domain before building the release APK/AAB.

## Build

Open the `android` folder in Android Studio, let it sync Gradle, then run the `app` configuration.

The shell supports:

- JavaScript, cookies, DOM storage, media playback, and responsive viewport.
- A loading screen that remains visible until the WebView finishes loading.
- File uploads for images, PDFs, and other attachments.
- Android back button navigation inside the WebView.
- External links such as `tel:`, `mailto:`, Telegram, Instagram, and maps via Android intents.
