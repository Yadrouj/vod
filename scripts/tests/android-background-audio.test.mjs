import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(`applications/android-mobile/${name}`,'utf8');
test('background audio uses an unexported foreground media service with a real player and media session',()=>{
 const manifest=read('AndroidManifest.xml'),service=read('src/ir/sarvnema/app/AudioPlaybackService.java');
 for(const value of ['FOREGROUND_SERVICE_MEDIA_PLAYBACK','WAKE_LOCK','android:foregroundServiceType="mediaPlayback"','android:exported="false"'])assert.ok(manifest.includes(value));
 for(const value of ['new MediaPlayer()','new MediaSession(','startForeground(','AUDIO_BECOMING_NOISY','OnAudioFocusChangeListener','START_NOT_STICKY','prepareTimeout','STOP_FOREGROUND_REMOVE'])assert.ok(service.includes(value));
 assert.doesNotMatch(service,/import android.webkit|RECORD_AUDIO|getUserMedia/);
});
test('handoff is origin-scoped, preserves position/rate/volume, and does not expose a JS bridge',()=>{
 const bridge=read('src/ir/sarvnema/app/BackgroundAudio.java'),activity=read('src/ir/sarvnema/app/MainActivity.java');
 assert.ok(activity.includes('backgroundAudio.pause()'));assert.ok(activity.includes('backgroundAudio.resume()'));
 for(const value of ['UrlPolicy.trusted(originPage)','originPage.equals(web.getUrl())','UrlPolicy.https(url)','UrlPolicy.trusted(url)','putExtra("position"','putExtra("rate"','putExtra("gain"','restoreNativeAudio','isFinishing()'])assert.ok(bridge.includes(value),value);
 assert.doesNotMatch(bridge,/addJavascriptInterface/);assert.ok(bridge.includes('JSONObject.quote('));
});
