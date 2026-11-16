import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { appReleaseUrl } from "../../lib/app-releases";

test("release buttons accept only explicit credential-free HTTPS URLs", () => {
  assert.equal(appReleaseUrl(" https://sarvnema.ir/apps/releases/mobile.apk "), "https://sarvnema.ir/apps/releases/mobile.apk");
  for (const value of [undefined, null, "", "/missing.apk", "http://cdn.example/a.apk", "javascript:alert(1)", "https://user:secret@cdn.example/a.apk", "https://cdn.example/a.apk#fake"]) assert.equal(appReleaseUrl(value), null);
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
