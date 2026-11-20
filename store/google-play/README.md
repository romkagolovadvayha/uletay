# Google Play — Улетай 1.0.19

Android package: `ru.uletay.app`. Release version code: **51**.

`ru-RU/listing.json` contains the title, short and full descriptions.
`release-notes.txt` contains the production release notes. `graphics/` contains six
1080 × 1920 RGB phone posters and the 1024 × 500 feature graphic.
Posters use the native application's screens: lineup, chat, voting, artist profile
and tracks, map, and the schedule with its native time slider. The schedule poster
explicitly identifies fictional demo data; the 2027 programme is unpublished.
The initial chat conversation uses fictional people marked as examples.

`data-safety.csv` declares VK OAuth, optional name/account identifier/avatar,
messages and votes, plus the previously declared map location and notification
device identifiers. Account deletion: https://uletayapp.ru/api/chat/account.
Other data deletion requests: https://uletayapp.ru/privacy.

Before uploading, verify the **built APK**, since a local generated Android
project can lag behind `app.json`:

```powershell
node scripts/verify-android-artifact.mjs --apk=android/app/build/outputs/apk/release/app-release.apk --aapt=C:/Users/rom_i/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt.exe
```

The check enforces the package, version/name, arm64 support, and absence of every
permission listed in `android.blockedPermissions`. The release is signed using
the existing upload key. Google Play signs delivered APKs with its own app key.
Credentials, keystores, raw QA captures and API release receipts remain ignored.
