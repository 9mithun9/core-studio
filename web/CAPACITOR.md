# Capacitor Mobile App Setup

This document explains how to build and deploy the Core Studio app for iOS and Android.

## Overview

The Core Studio app uses Capacitor to wrap the Next.js web app into native mobile applications for iOS and Android. The same codebase powers the web, iOS, and Android versions.

## Prerequisites

### For iOS Development
- **macOS required** (iOS apps can only be built on Mac)
- **Xcode** installed from App Store (latest version)
- **iOS Simulator** (included with Xcode)
- **Apple Developer Account** ($99/year) for App Store deployment

### For Android Development
- **Android Studio** installed (works on Windows, Mac, Linux)
- **Android SDK** (installed via Android Studio)
- **Java Development Kit (JDK)** version 11 or higher
- **Google Play Developer Account** ($25 one-time fee) for Play Store deployment

## Build Commands

### Development Workflow

```bash
# Regular web development (unchanged)
npm run dev

# Build for web deployment (unchanged)
npm run build
npm start

# Build for mobile (creates static export in 'out' directory)
npm run build:mobile

# Sync web code to native projects
npm run sync

# Open iOS project in Xcode (Mac only)
npm run open:ios

# Open Android project in Android Studio
npm run open:android
```

### Detailed Build Process

1. **Build the mobile version**:
   ```bash
   npm run build:mobile
   ```
   This command:
   - Sets `CAPACITOR_BUILD=true` environment variable
   - Runs Next.js static export (creates `out` directory)
   - Syncs the build to iOS and Android projects

2. **Open native projects**:

   **For iOS**:
   ```bash
   npm run open:ios
   ```
   This opens the iOS project in Xcode where you can:
   - Run on iOS Simulator
   - Run on physical iOS device
   - Configure app signing
   - Build for App Store

   **For Android**:
   ```bash
   npm run open:android
   ```
   This opens the Android project in Android Studio where you can:
   - Run on Android Emulator
   - Run on physical Android device
   - Configure app signing
   - Build for Google Play Store

## Configuration

### App Metadata

Edit `capacitor.config.ts` to change:
- **App ID**: `com.corestudio.app` (must be unique, reverse domain format)
- **App Name**: `Core Studio`
- **Allowed domains**: Update server URLs for production

### API Configuration

The app is configured to connect to your API server:
- **Development**: `localhost:5000`
- **Production**: Update `NEXT_PUBLIC_API_URL` in `.env.production`

## App Icons and Splash Screens

### Required Assets

You'll need to create app icons in various sizes:

**iOS**:
- 1024x1024px - App Store icon
- 180x180px - iPhone app icon
- 167x167px - iPad Pro app icon
- 152x152px - iPad app icon
- 120x120px - iPhone app icon (2x)
- 76x76px - iPad app icon (1x)

**Android**:
- 512x512px - Play Store icon
- 192x192px - xxxhdpi
- 144x144px - xxhdpi
- 96x96px - xhdpi
- 72x72px - hdpi
- 48x48px - mdpi

### Generating Icons

1. Create a high-resolution icon (1024x1024px) and save it as `resources/icon.png`
2. Use a tool like [Capacitor Asset Generator](https://github.com/capacitor-community/capacitor-assets) to generate all sizes:
   ```bash
   npm install -g @capacitor/assets
   npx capacitor-assets generate --iconBackgroundColor '#ffffff'
   ```

## Testing

### iOS Testing

1. Build the mobile version: `npm run build:mobile`
2. Open Xcode: `npm run open:ios`
3. Select a simulator or connected device
4. Click the "Play" button to build and run

### Android Testing

1. Build the mobile version: `npm run build:mobile`
2. Open Android Studio: `npm run open:android`
3. Wait for Gradle sync to complete
4. Select an emulator or connected device
5. Click the "Run" button to build and install

## Deployment

### iOS App Store

1. **Configure App Store Connect**:
   - Create app entry in App Store Connect
   - Set up bundle ID, app name, description
   - Upload screenshots (required sizes)
   - Set pricing and availability

2. **Build for Release**:
   - In Xcode, select "Any iOS Device" as target
   - Product → Archive
   - Distribute App → App Store Connect
   - Upload and wait for processing

3. **Submit for Review**:
   - Return to App Store Connect
   - Fill in required metadata
   - Submit for review (1-3 days approval time)

### Google Play Store

1. **Configure Google Play Console**:
   - Create app in Play Console
   - Set up store listing (title, description, screenshots)
   - Set content rating and target audience
   - Set pricing and distribution countries

2. **Build Release APK/AAB**:
   - In Android Studio: Build → Generate Signed Bundle/APK
   - Choose Android App Bundle (.aab) format
   - Create or use existing keystore for signing
   - Build release bundle

3. **Upload and Release**:
   - Upload .aab to Play Console
   - Create a release (Internal, Alpha, Beta, or Production)
   - Submit for review (few hours approval time)

## Update Workflow

When you update your web app:

1. **Update web code** (as you normally would)
2. **Test in browser** (`npm run dev`)
3. **Build for mobile**: `npm run build:mobile`
4. **Test on native platforms**:
   - iOS: `npm run open:ios` and test in simulator
   - Android: `npm run open:android` and test in emulator
5. **Deploy web version** (your normal deployment)
6. **Deploy mobile updates** (through app stores)

## Native Features

Capacitor provides access to native features. Install plugins as needed:

```bash
# Push notifications
npm install @capacitor/push-notifications

# Camera
npm install @capacitor/camera

# Geolocation
npm install @capacitor/geolocation

# Local storage
npm install @capacitor/preferences

# Status bar
npm install @capacitor/status-bar

# Splash screen
npm install @capacitor/splash-screen
```

After installing plugins, run:
```bash
npm run sync
```

## Troubleshooting

### "out directory not found" error
Run `npm run build:mobile` before `npm run sync`

### Xcode build errors
- Update to latest Xcode version
- Clean build folder: Product → Clean Build Folder
- Delete `ios/App/Pods` and run `pod install`

### Android Gradle errors
- Update Android Studio and Gradle
- File → Invalidate Caches and Restart
- Delete `android/.gradle` and rebuild

### API connection issues
- Check `NEXT_PUBLIC_API_URL` in environment variables
- Verify `allowNavigation` domains in `capacitor.config.ts`
- Enable CORS on your API server for mobile app domain

## Cost Estimates

**Initial Setup**:
- Development time: 1-2 weeks (testing and refinement)
- Apple Developer Account: $99/year
- Google Play Developer Account: $25 one-time
- App icon design: $50-200 (if hiring designer)

**Ongoing**:
- Apple renewal: $99/year
- Maintenance: Updates as needed (follows web updates)

## Important Notes

- The web app continues to work exactly as before
- Mobile apps are separate builds using the same code
- You can deploy web and mobile independently
- Users must update mobile apps through app stores
- Web updates are instant, mobile updates require app store approval

## Support

For Capacitor documentation: https://capacitorjs.com/docs
For issues: Create issue in project repository
