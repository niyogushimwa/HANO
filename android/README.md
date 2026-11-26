# ⚠️ HANO Android scaffold — NOT RUNNABLE YET

This folder is a **source-code scaffold only**. It is **not a compiled app**, it has **not been built or tested**, and it **will not run** until you complete the steps below.

The working, tested application in this project is the PWA at `../index.html`.
This Android folder exists to preserve the native Kotlin/Jetpack Compose + Firebase architecture from the HANO specification.

## What is missing before it can run

| Missing item | Why it matters |
| --- | --- |
| Android Studio + Android SDK (API 35) | Required to compile the Gradle project |
| `app/google-services.json` | Firebase project connection (Auth, Firestore, Storage, Messaging) |
| A Firebase project with **Email/Password Auth enabled** | Otherwise `FirebaseAuth` calls fail |
| Cloud Firestore database + the rules in `firestore.rules` | Otherwise reads/writes are denied |
| Cloud Storage bucket + the rules in `storage.rules` | Otherwise photo uploads are denied |
| Gradle wrapper (`gradlew`, `gradle-wrapper.jar`) | Generate it with Android Studio; not included here |
| FCM setup for push notifications | In-app notifications exist in the PWA; native push is not implemented here |

## Steps to turn the scaffold into a real app

1. Open Android Studio → **Open** → select `HANO/android`.
2. Let Android Studio generate the Gradle wrapper and sync Gradle.
3. In Firebase Console → **Add project** → **Add app → Android** with package `rw.hano.app`.
4. Download `google-services.json` into `app/` (it is intentionally not committed; see `google-services.json.example`).
5. Enable **Authentication → Sign-in method → Email/Password**.
6. Create **Cloud Firestore** and **Storage**, then publish the rules from `firestore.rules` and `storage.rules`.
7. Build and run on an emulator or device.
8. Only then treat the code as testable — until then, do not claim the native app works.

## What the scaffold contains

```
android/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── firestore.rules               # Example security rules (review before production)
├── storage.rules                 # Example photo upload rules
├── app/
│   ├── build.gradle.kts
│   ├── google-services.json.example
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── java/rw/hano/app/
│           ├── HanoApplication.kt
│           ├── MainActivity.kt
│           ├── data/Models.kt
│           ├── data/HanoRepository.kt
│           ├── ui/theme/Theme.kt
│           └── ui/screens/HanoApp.kt
```

The Kotlin code follows the same feature set and status values as the PWA, but it is a starting point, not a finished product.
