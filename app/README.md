# Android app (APK)

A thin [Capacitor](https://capacitorjs.com) shell around the website (it loads https://taskrti76.github.io/Slovenija2k-Challenge/,
so every website update is in the app at once) plus native GPS for the summit check (`@capacitor-community/background-geolocation`,
also with the screen off, with a notification while it runs).

Built only by GitHub Actions (`.github/workflows/android.yml`) - on a change in `app/` or by hand (Actions → Android app → Run workflow).
The APK is attached to a GitHub release; the website links to `releases/latest/download/dvatisocaki.apk`.

Signing key: made by the first run, stored encrypted as `app/release.jks.enc` (AES-256, key = the `BACKUP_PASSPHRASE` secret).
Keep that secret: without it no update can be signed with the same key (phones would need to uninstall first).
