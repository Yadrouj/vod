package ir.sarvnema.app;

import android.app.Activity;
import android.content.Intent;
import android.os.*;
import android.webkit.*;
import ir.sarvnema.shell.UrlPolicy;
import org.json.*;

/** Read-only, origin-checked snapshots: no JavaScript interface exposed to frames. */
final class BackgroundAudio {
    private final Activity activity;
    private final WebView web;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private JSONObject snapshot;
    private long captured;
    private boolean foreground;
    private final Runnable poll=new Runnable(){@Override public void run(){
        if(!foreground)return;
        String originPage=web.getUrl();
        restoreNativeAudio();
        if(UrlPolicy.trusted(originPage))web.evaluateJavascript("(function(){var a=document.querySelector('.music-player-audio audio[data-analytics-media=audio]');if(!a||a.paused||a.ended||!a.currentSrc)return null;var m=navigator.mediaSession&&navigator.mediaSession.metadata;return JSON.stringify({id:(a.dataset.analyticsId||'').replace(/^music:/,''),queue:a.dataset.nativeQueue||'[]',repeat:a.dataset.nativeRepeat||'off',shuffle:a.dataset.nativeShuffle==='true',url:a.currentSrc,position:a.currentTime,rate:a.playbackRate,gain:a.muted?0:a.volume,title:m?m.title:document.title,artist:m?m.artist:''});})()",value->{
            if(!foreground||!originPage.equals(web.getUrl()))return;
            try{Object decoded=new JSONTokener(value).nextValue();snapshot=decoded instanceof String?new JSONObject((String)decoded):null;captured=SystemClock.elapsedRealtime();}catch(JSONException bad){snapshot=null;}
        });
        handler.postDelayed(this,750);
    }};
    BackgroundAudio(Activity activity,WebView web){this.activity=activity;this.web=web;}
    void resume(){
        foreground=true;web.onResume();
        handler.removeCallbacks(poll);handler.post(poll);
    }
    private void restoreNativeAudio(){
        Bundle state=AudioPlaybackService.snapshot();
        if(state==null||!UrlPolicy.trusted(web.getUrl()))return;
        String url=JSONObject.quote(state.getString("url","")), id=JSONObject.quote(state.getString("id",""));
        double seconds=state.getLong("position")/1000.0;
        // Native audio continues until the visible document has the matching, ready player.
        web.evaluateJavascript("(function(){var a=document.querySelector('.music-player-audio audio[data-analytics-media=audio]');if(!a)return false;if(a.dataset.analyticsId!=='music:'+"+id+"){if(!a.paused)return true;window.dispatchEvent(new CustomEvent('sarvnema:native-resume',{detail:{id:"+id+"}}));return false;}if(a.readyState<2)return false;a.currentTime="+seconds+";"+(state.getBoolean("playing")?"a.play().catch(function(){});":"a.pause();")+"return true;})()",value->{if(foreground&&"true".equals(value))AudioPlaybackService.reclaim();});
    }
    void pause(){
        foreground=false;handler.removeCallbacks(poll);
        if(snapshot!=null&&SystemClock.elapsedRealtime()-captured<2500&&UrlPolicy.trusted(web.getUrl())){
            String url=snapshot.optString("url");
            if(UrlPolicy.https(url)){
                Intent start=new Intent(activity,AudioPlaybackService.class).setAction(AudioPlaybackService.PLAY)
                    .putExtra("url",url).putExtra("position",(long)(snapshot.optDouble("position",0)*1000)+Math.min(1000,SystemClock.elapsedRealtime()-captured))
                    .putExtra("title",snapshot.optString("title","سرونما")).putExtra("artist",snapshot.optString("artist",""))
                    .putExtra("rate",(float)snapshot.optDouble("rate",1)).putExtra("gain",(float)snapshot.optDouble("gain",1));
                if(UrlPolicy.trusted(url)){String cookie=CookieManager.getInstance().getCookie(url);if(cookie!=null)start.putExtra("cookie",cookie);}
                start.putExtra("id",snapshot.optString("id")).putExtra("queue",snapshot.optString("queue","[]"))
                    .putExtra("repeat",snapshot.optString("repeat","off")).putExtra("shuffle",snapshot.optBoolean("shuffle",false));
                try{activity.startForegroundService(start);}catch(RuntimeException restricted){/* The visible player remains resumable; never crash on OEM restrictions. */}
            }
        }
        snapshot=null;
        web.evaluateJavascript("(function(){var a=document.querySelector('.music-player-audio audio[data-analytics-media=audio]');var playing=!!a&&!a.paused&&!a.ended;document.querySelectorAll('video,audio').forEach(function(m){m.pause();});return playing;})()",value->{if(!foreground&&"false".equals(value))activity.stopService(new Intent(activity,AudioPlaybackService.class));});
        web.onPause();
    }
    void destroy(){foreground=false;handler.removeCallbacksAndMessages(null);if(activity.isFinishing())activity.stopService(new Intent(activity,AudioPlaybackService.class));}
}
