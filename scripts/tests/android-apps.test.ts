import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { unzipSync } from 'fflate';
import path from "node:path";
import { appReleaseUrl, bundledAppReleases } from "../../lib/app-releases";
import { BRAND_SLOGAN_FA } from "../../lib/brand";

test("release buttons accept only explicit credential-free HTTPS URLs", () => {
  assert.equal(appReleaseUrl(" https://sarvnema.ir/apps/releases/mobile.apk "), "https://sarvnema.ir/apps/releases/mobile.apk");
  for (const value of [undefined, null, "", "/missing.apk", "http://cdn.example/a.apk", "javascript:alert(1)", "https://user:secret@cdn.example/a.apk", "https://cdn.example/a.apk#fake"]) assert.equal(appReleaseUrl(value), null);
});

test("bundled preview downloads exist, match their checksums and native versions, and contain no signing keys", () => {
  for (const [edition, release] of Object.entries(bundledAppReleases)) {
    const url = new URL(release.url);
    assert.equal(url.origin, "https://sarvnema.ir");
    assert.match(url.pathname, /^\/apps\/releases\/sarvnema-(?:android|tv)-[\d.]+-preview\.apk$/);
    assert.equal(appReleaseUrl(release.url), release.url);
    const bytes = readFileSync(path.join("public", url.pathname));
    assert.equal(bytes.length, release.bytes);
    assert.equal(bytes.subarray(0, 2).toString(), "PK", "an APK is a ZIP, not an HTML error");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), release.sha256);
    const archive = unzipSync(bytes);
    for (const name of ['startup_scene_01.webp', 'startup_scene_02.webp', 'startup_scene_03.webp', 'alibaba_black.ttf', 'alibaba_regular.ttf']) {
      const entry = Object.keys(archive).find(key => key.endsWith('/' + name));
      assert.ok(entry, `${release.packageId}: bundled ${name}`);
      const folder = name.endsWith('.ttf') ? 'font' : 'drawable-nodpi';
      assert.deepEqual(Buffer.from(archive[entry]), readFileSync(`applications/android-common/res/${folder}/${name}`));
    }
    assert.ok(Buffer.from(archive['classes.dex']).includes(Buffer.from('CinematicBackdrop')));
    const manifest = readFileSync(`applications/android-${edition === "mobile" ? "mobile" : "tv"}/AndroidManifest.xml`, "utf8");
    assert.ok(manifest.includes(`package="${release.packageId}"`));
    assert.ok(manifest.includes(`android:versionName="${release.version}"`));
    assert.doesNotMatch(bytes.toString("latin1"), /\.keystore|\.jks|BEGIN (?:RSA |EC )?PRIVATE KEY/);
  }
});

test("both installable apps have the SarvNema name and one canonical adaptive icon, with distinct package IDs", () => {
  const manifests = ["android-mobile", "android-tv"].map(variant => readFileSync(`applications/${variant}/AndroidManifest.xml`, "utf8"));
  assert.match(manifests[0], /package="ir\.sarvnema\.app"/);
  assert.match(manifests[1], /package="ir\.sarvnema\.tv"/);
  for (const manifest of manifests) {
    assert.match(manifest, /android:label="@string\/app_name"/);
    assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
    assert.match(manifest, /android:usesCleartextTraffic="false"/);
    assert.doesNotMatch(manifest, /MANAGE_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|READ_CONTACTS|READ_MEDIA/);
  }
  assert.match(readFileSync("applications/android-common/res/values/brand.xml", "utf8"), /<string name="app_name">سرونما<\/string>/);
  const svg = readFileSync("public/brand/sarvnema-mark.svg", "utf8");
  const vector = readFileSync("applications/android-common/res/drawable/brand_foreground.xml", "utf8");
  const numbers = (value: string) => value.match(/-?\d*\.?\d+/g)?.map(Number);
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(match => numbers(match[1]));
  const androidPaths = [...vector.matchAll(/android:pathData="([^"]+)"/g)].map(match => numbers(match[1]));
  assert.deepEqual(androidPaths, paths, "icon geometry is the brand mark, not an approximate redraw");
  assert.match(vector, /fillColor="#F4F4F4"/); assert.match(vector, /fillAlpha="0.22"/);
});

test("mobile shell keeps runtime media access origin-scoped and avoids a privileged JS bridge", () => {
  const java = readFileSync("applications/android-mobile/src/ir/sarvnema/app/MainActivity.java", "utf8");
  assert.doesNotMatch(java, /addJavascriptInterface|setAllowFileAccess\(true\)|MIXED_CONTENT_ALWAYS_ALLOW|\.proceed\(\)/);
  assert.match(java, /MIXED_CONTENT_NEVER_ALLOW/);
  assert.match(java, /UrlPolicy\.trusted\(request\.getOrigin\(\)\.toString\(\)\)/);
  assert.match(java, /requestPermissions\(/);
  assert.match(java, /Intent\.ACTION_OPEN_DOCUMENT/);
  assert.match(java, /UrlPolicy\.trusted\(url\)[\s\S]*getCookie/);
  assert.match(java, /SCREEN_ORIENTATION_SENSOR_LANDSCAPE/);
  assert.match(java, /previousOrientation/);
});

test("native URL policy executes on the JDK, including hostile URI cases", t => {
  const home = process.env.JAVA_HOME || (process.platform === "win32" ? path.join(process.env.ProgramFiles || "C:/Program Files", "Android/Android Studio/jbr") : "");
  const javac = home ? path.join(home, "bin", process.platform === "win32" ? "javac.exe" : "javac") : "javac";
  const java = home ? path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java") : "java";
  try { execFileSync(javac, ["-version"], { stdio: "pipe" }); } catch { t.skip("JDK unavailable; run the test in the Android build environment"); return; }
  const output = path.resolve(".media-cache/android-app-tests/java"); mkdirSync(output, { recursive: true });
  execFileSync(javac, ["--release", "8", "-d", output, "applications/android-common/src/ir/sarvnema/shell/UrlPolicy.java", "applications/android-common/tests/UrlPolicySpec.java"], { stdio: "pipe" });
  assert.match(execFileSync(java, ["-cp", output, "UrlPolicySpec"], { encoding: "utf8" }), /PASS: URL policy/);
});

test("both native editions have one shared branded startup and explicit Persian launcher/activity names", () => {
  const resources = readFileSync("applications/android-common/res/values/brand.xml", "utf8");
  assert.ok(resources.includes(`<string name="brand_slogan">${BRAND_SLOGAN_FA}</string>`), "same slogan as the website");
  const layout = readFileSync("applications/android-common/res/layout/startup_screen.xml", "utf8");
  for (const tag of ["startup_brand", "startup_mark", "startup_progress", "startup_status"]) assert.ok(layout.includes(`android:tag="${tag}"`));
  assert.match(layout, /@string\/app_name/); assert.match(layout, /@string\/brand_slogan/);
  assert.match(layout, /@drawable\/brand_foreground/);
  assert.match(layout, /<ScrollView/); assert.match(layout, /android:fillViewport="true"/);
  assert.match(layout, /android:layoutDirection="rtl"/); assert.match(layout, /android:accessibilityLiveRegion="polite"/);
  for (const [variant, id] of [["android-mobile", "app"], ["android-tv", "tv"]]) {
    const manifest = readFileSync(`applications/${variant}/AndroidManifest.xml`, "utf8");
    assert.match(manifest, /android:theme="@style\/SarvNema"/);
    assert.match(manifest, /<activity[^>]+android:label="@string\/app_name"/);
    assert.equal([...manifest.matchAll(/<activity\s/g)].length, 1, "no separate splash Activity or duplicate launch");
    const java = readFileSync(`applications/${variant}/src/ir/sarvnema/${id}/MainActivity.java`, "utf8");
    for (const value of ["StartupScreen.handoffSystemSplash(this)", "setTitle(R.string.app_name)", "new StartupScreen(", "startup.pageStarted()", "startup.pageFinished()", "startup.progress(value)", "startup.pause()", "startup.resume()", "startup.cancel()"])
      assert.ok(java.includes(value), `${variant}: ${value}`);
    assert.doesNotMatch(java, /onPageCommitVisible/, "first committed response is too early to dismiss startup");
  }
  const modernTheme = readFileSync("applications/android-common/res/values-v31/styles.xml", "utf8");
  assert.match(modernTheme, /android:windowSplashScreenBackground/);
  assert.match(modernTheme, /@drawable\/brand_foreground/);
  const tv = readFileSync("applications/android-tv/src/ir/sarvnema/tv/MainActivity.java", "utf8");
  assert.match(tv, /if \(errorView == null && \(startup == null \|\| !startup\.blocksInput\(\)\)\) web\.requestFocus\(\)/, "late page-finished must not steal focus from native retry");
  assert.match(tv, /if \(errorView != null \|\| \(startup != null && startup\.blocksInput\(\)\)\) return true/, "media keys cannot start hidden playback during startup/error");
});

test("startup uses actual render readiness, bounded waiting and accessible lifecycle-safe motion", () => {
  const java = readFileSync("applications/android-common/src/ir/sarvnema/shell/StartupScreen.java", "utf8");
  for (const value of ["document.readyState==='complete'", "document.querySelector('main')", "document.fonts.status==='loaded'", "postVisualStateCallback", "state.reveal(id)", "ValueAnimator.areAnimatorsEnabled()", "isFinishing()", "isDestroyed()", "onTimeout.run()", "handler.removeCallbacksAndMessages(null)", "web.setImportantForAccessibility", "web.setDescendantFocusability"])
    assert.ok(java.includes(value), value);
  assert.match(java, /SLOW_MS = 8000, TIMEOUT_MS = 35000/);
  const navigation = java.split("public void pageStarted()")[1].split("public void progress(")[0];
  assert.doesNotMatch(navigation, /scheduleDeadline|removeCallbacksAndMessages/, "redirects cannot reset the overall deadline");
  assert.doesNotMatch(java, /addJavascriptInterface|setVisibility\(View\.(?:GONE|INVISIBLE)\)|Thread\.sleep|setStartDelay/, "no blank hidden WebView, privileged bridge or artificial minimum wait");
});

test("cinematic startup bundles three small offline scenes and real Persian font resources", async () => {
  const layout = readFileSync('applications/android-common/res/layout/startup_screen.xml', 'utf8');
  assert.match(layout, /ir\.sarvnema\.shell\.CinematicBackdrop/);
  assert.match(layout, /@font\/alibaba_black/); assert.match(layout, /@font\/alibaba_regular/);
  for (const weight of ['black', 'regular']) assert.deepEqual(readFileSync(`applications/android-common/res/font/alibaba_${weight}.ttf`), readFileSync(`public/fonts/alibaba-${weight}.ttf`));
  const { default: sharp } = await import('sharp');
  for (let i = 1; i <= 3; i++) {
    const bytes = readFileSync(`applications/android-common/res/drawable-nodpi/startup_scene_0${i}.webp`);
    assert.ok(bytes.length < 160000);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 1280); assert.equal(metadata.height, 720);
  }
  const backdrop = readFileSync('applications/android-common/src/ir/sarvnema/shell/CinematicBackdrop.java', 'utf8');
  assert.match(backdrop, /newSingleThreadExecutor/); assert.match(backdrop, /Bitmap\.Config\.RGB_565/);
  assert.match(backdrop, /postDelayed\(this, 33\)/); assert.match(backdrop, /loader\.shutdownNow\(\)/);
  assert.match(backdrop, /volatile boolean released/);
  assert.doesNotMatch(backdrop, /https?:\/\/|MediaPlayer|VideoView|\.recycle\(/);
  const controller = readFileSync('applications/android-common/src/ir/sarvnema/shell/StartupScreen.java', 'utf8');
  assert.match(controller, /mark\.setClipBounds/); assert.match(controller, /cinema\.pauseMotion\(\)/);
  assert.match(controller, /smallestScreenWidthDp >= 600 \? 520 : 420/);
  assert.match(controller, /UI_MODE_TYPE_TELEVISION/);
  assert.match(readFileSync('applications/android-common/res/values-television/startup.xml', 'utf8'), /60sp/);
});

test("cinematic timing math runs scene-transition and long-uptime checks on the JDK", t => {
  const home = process.env.JAVA_HOME || (process.platform === 'win32' ? path.join(process.env.ProgramFiles || 'C:/Program Files', 'Android/Android Studio/jbr') : '');
  const executable = (name: string) => home ? path.join(home, 'bin', `${name}${process.platform === 'win32' ? '.exe' : ''}`) : name;
  try { execFileSync(executable('javac'), ['-version'], { stdio: 'pipe' }); } catch { t.skip('JDK unavailable'); return; }
  const output = path.resolve('.media-cache/android-app-tests/motion'); mkdirSync(output, { recursive: true });
  execFileSync(executable('javac'), ['--release', '8', '-d', output, 'applications/android-common/src/ir/sarvnema/shell/StartupMotion.java', 'applications/android-common/tests/StartupMotionSpec.java'], { stdio: 'pipe' });
  assert.match(execFileSync(executable('java'), ['-cp', output, 'StartupMotionSpec'], { encoding: 'utf8' }), /PASS: startup motion/);
});

test("native startup state executes redirect, load/error, retry and teardown regressions on the JDK", t => {
  const home = process.env.JAVA_HOME || (process.platform === "win32" ? path.join(process.env.ProgramFiles || "C:/Program Files", "Android/Android Studio/jbr") : "");
  const executable = (name: string) => home ? path.join(home, "bin", `${name}${process.platform === "win32" ? ".exe" : ""}`) : name;
  try { execFileSync(executable("javac"), ["-version"], { stdio: "pipe" }); } catch { t.skip("JDK unavailable; run in the Android build environment"); return; }
  const output = path.resolve(".media-cache/android-app-tests/startup"); mkdirSync(output, { recursive: true });
  execFileSync(executable("javac"), ["--release", "8", "-d", output, "applications/android-common/src/ir/sarvnema/shell/StartupState.java", "applications/android-common/tests/StartupStateSpec.java"], { stdio: "pipe" });
  assert.match(execFileSync(executable("java"), ["-cp", output, "StartupStateSpec"], { encoding: "utf8" }), /PASS: startup state \(23 checks\)/);
});
