# سرونما applications

| Edition | Visible name | Application ID | Opens |
| --- | --- | --- | --- |
| Android phone/tablet | سرونما | `ir.sarvnema.app` | `https://sarvnema.ir/` |
| Android TV | سرونما | `ir.sarvnema.tv` | `https://sarvnema.ir/tv` |

Both use the exact shared cypress/play mark from `public/brand/sarvnema-mark.svg`,
with an adaptive launcher icon and the same Persian app-name resource. IDs stay
distinct for side-by-side installation and preserve the previous TV package ID.

The existing `/apps` page now introduces both editions, their real capabilities,
setup steps, IDs and separate release links. It remains a page in the existing
Next.js site; no alternate hosted site or duplicate content catalog is created.

## Build

```powershell
./applications/android-mobile/build-debug.ps1
./applications/android-tv/build-debug.ps1
```

See [mobile documentation](android-mobile/README.md) and [TV documentation](android-tv/README.md).
Shared resources live in `android-common/res`; the common SDK CLI pipeline lives in
`tools/build-android-debug.ps1`. No Gradle/plugin download is needed for the preview.

## Release configuration

Add `ANDROID_MOBILE_APK_URL` and `ANDROID_TV_APK_URL` to the site's private environment
only after signed artifacts have actually been hosted. See `release.env.example`.
Never commit signing keys, signing passwords or pretend a debug APK is store-ready.
No production website deployment/store publication is implicit in building the APKs.

## Verify

```powershell
node --import tsx --test scripts/tests/android-apps.test.ts
npx tsc --noEmit
```

Native URI policy tests run on a JDK, with hostile-host/scheme/credential cases.
The test also checks exact brand geometry, labels, separate packages and release
URL validation. Physical-device checks remain necessary for native integrations.
