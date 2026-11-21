package ir.sarvnema.app;

import android.app.*;
import android.content.*;
import android.media.*;
import android.media.session.*;
import android.net.Uri;
import android.os.*;
import ir.sarvnema.shell.UrlPolicy;
import java.util.HashMap;
import java.util.ArrayList;
import org.json.*;

/** Owns audio while the WebView is suspended. Never hosts a WebView or microphone. */
public final class AudioPlaybackService extends Service {
    static AudioPlaybackService current;
    static final String PLAY="ir.sarvnema.app.AUDIO_PLAY", PAUSE="ir.sarvnema.app.AUDIO_PAUSE", STOP="ir.sarvnema.app.AUDIO_STOP", NEXT="ir.sarvnema.app.AUDIO_NEXT";
    private MediaPlayer player;
    private MediaSession session;
    private AudioManager audio;
    private AudioFocusRequest focus;
    private boolean prepared, wantsPlay, resumeAfterFocus;
    private long initialPosition;
    private float rate=1f, gain=1f;
    private String title="سرونما", artist="", url="";
    private String currentId="", repeatMode="off", sessionCookie="";
    private boolean shuffle;
    private final ArrayList<JSONObject> queue=new ArrayList<>();
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable expire=()->{if(!wantsPlay)stopSelf();};
    private final Runnable prepareTimeout=()->{if(!prepared)stopSelf();};
    private final AudioManager.OnAudioFocusChangeListener focusListener=change->{
        if(change==AudioManager.AUDIOFOCUS_GAIN){if(player!=null&&prepared)player.setVolume(gain,gain);if(resumeAfterFocus){resumeAfterFocus=false;play();}}
        else if(change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK){if(player!=null&&prepared)player.setVolume(.2f*gain,.2f*gain);}
        else {boolean resume=change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT&&wantsPlay;pause();resumeAfterFocus=resume;}
    };
    private final BroadcastReceiver noisy=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){pause();}};
    @Override public void onCreate(){
        super.onCreate();current=this;
        audio=(AudioManager)getSystemService(AUDIO_SERVICE);
        AudioAttributes attrs=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
        focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(attrs).setOnAudioFocusChangeListener(focusListener).build();
        session=new MediaSession(this,"SarvNema Music");
        session.setSessionActivity(PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        session.setCallback(new MediaSession.Callback(){
            @Override public void onPlay(){play();}
            @Override public void onPause(){pause();}
            @Override public void onStop(){stopSelf();}
            @Override public void onSeekTo(long position){seek(position);}
            @Override public void onFastForward(){seek(position()+10000);}
            @Override public void onRewind(){seek(position()-10000);}
            @Override public void onSkipToNext(){advance(1);}
            @Override public void onSkipToPrevious(){if(position()>4000)seek(0);else advance(-1);}
        });
        session.setActive(true);
        session.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS|MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(new NotificationChannel("music-playback","پخش موسیقی",NotificationManager.IMPORTANCE_LOW));
        if(Build.VERSION.SDK_INT>=33)registerReceiver(noisy,new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(noisy,new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null){stopSelf();return START_NOT_STICKY;}
        String action=intent.getAction();
        if(STOP.equals(action)){stopSelf();return START_NOT_STICKY;}
        if(PAUSE.equals(action)){pause();return START_NOT_STICKY;}
        if(NEXT.equals(action)){advance(1);return START_NOT_STICKY;}
        if(!intent.hasExtra("url")){play();return START_NOT_STICKY;}
        String source=intent.getStringExtra("url");
        if(!UrlPolicy.https(source)){stopSelf();return START_NOT_STICKY;}
        title=intent.getStringExtra("title");artist=intent.getStringExtra("artist");url=source;
        currentId=intent.getStringExtra("id");
        if(intent.hasExtra("queue")){
            queue.clear();String raw=intent.getStringExtra("queue");
            try{if(raw!=null&&raw.length()<131072){JSONArray items=new JSONArray(raw);for(int i=0;i<Math.min(100,items.length());i++){
                JSONObject item=items.optJSONObject(i);if(item==null)continue;
                String mediaUrl=new java.net.URI("https://sarvnema.ir").resolve(item.optString("url")).toString();
                if(!item.optString("id").matches("[a-zA-Z0-9_-]{1,100}")||mediaUrl.length()>4000||!UrlPolicy.https(mediaUrl))continue;
                item.put("url",mediaUrl);queue.add(item);
            }}}catch(Exception malformed){queue.clear();}
            repeatMode=intent.getStringExtra("repeat");shuffle=intent.getBooleanExtra("shuffle",false);
            sessionCookie=intent.getStringExtra("cookie");
        }
        initialPosition=Math.max(0,intent.getLongExtra("position",0));
        rate=Math.max(.5f,Math.min(2f,intent.getFloatExtra("rate",1f)));
        gain=Math.max(0,Math.min(1,intent.getFloatExtra("gain",1f)));
        startForeground(7104,notification()); // Android requires this promptly, before async preparation.
        try{
            if(player!=null)player.release();
            prepared=false;wantsPlay=true;player=new MediaPlayer();
            player.setVolume(gain,gain);
            player.setLooping("one".equals(repeatMode));
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            player.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK);
            HashMap<String,String> headers=new HashMap<>();
            // Forward session cookies only to our own same-origin music endpoint.
            if(UrlPolicy.trusted(source)&&intent.hasExtra("cookie"))headers.put("Cookie",intent.getStringExtra("cookie"));
            player.setDataSource(this,Uri.parse(source),headers);
            player.setOnPreparedListener(p->{handler.removeCallbacks(prepareTimeout);prepared=true;seek(initialPosition);if(wantsPlay)play();else update();});
            player.setOnCompletionListener(p->{if(!advance(1)){wantsPlay=false;update();handler.postDelayed(expire,300000);}});
            player.setOnErrorListener((p,what,extra)->{wantsPlay=false;prepared=false;stopSelf();return true;});
            player.prepareAsync();handler.postDelayed(prepareTimeout,30000);update();
        }catch(Exception unavailable){stopSelf();}
        return START_NOT_STICKY;
    }
    private void play(){
        wantsPlay=true;handler.removeCallbacks(expire);
        if(!prepared||player==null)return;
        // Android 15 requires an active foreground service before requesting focus in background.
        startForeground(7104,notification());
        if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){wantsPlay=false;update();return;}
        try{player.setPlaybackParams(new PlaybackParams().setSpeed(rate));player.start();}catch(RuntimeException failed){wantsPlay=false;}
        update();
    }
    private void pause(){
        wantsPlay=false;resumeAfterFocus=false;
        try{if(prepared&&player!=null&&player.isPlaying())player.pause();}catch(RuntimeException ignored){}
        audio.abandonAudioFocusRequest(focus);update();handler.removeCallbacks(expire);handler.postDelayed(expire,300000);
    }
    private long position(){try{return prepared&&player!=null?player.getCurrentPosition():initialPosition;}catch(RuntimeException unavailable){return initialPosition;}}
    private void seek(long value){if(prepared&&player!=null)player.seekTo(Math.max(0,Math.min(value,player.getDuration())),MediaPlayer.SEEK_CLOSEST);}
    private boolean advance(int direction){
        int index=-1;for(int i=0;i<queue.size();i++)if(queue.get(i).optString("id").equals(currentId)){index=i;break;}
        if(index<0)return false;
        int next=index+direction;
        if(shuffle&&queue.size()>1&&direction>0){do{next=(int)(Math.random()*queue.size());}while(next==index);}
        if(next<0||next>=queue.size()){if(!"all".equals(repeatMode))return false;next=(next+queue.size())%queue.size();}
        JSONObject item=queue.get(next);
        Intent command=new Intent(this,AudioPlaybackService.class).setAction(PLAY).putExtra("url",item.optString("url")).putExtra("id",item.optString("id"))
            .putExtra("title",item.optString("title","سرونما")).putExtra("artist",item.optString("artist","")).putExtra("rate",rate).putExtra("gain",gain);
        if(UrlPolicy.trusted(item.optString("url"))&&sessionCookie!=null)command.putExtra("cookie",sessionCookie);
        onStartCommand(command,0,0);return true;
    }
    private PendingIntent command(String action,int id){return PendingIntent.getService(this,id,new Intent(this,AudioPlaybackService.class).setAction(action),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    private Notification notification(){
        boolean playing=wantsPlay;
        return new Notification.Builder(this,"music-playback").setSmallIcon(R.drawable.app_icon)
            .setContentTitle(title==null?"سرونما":title).setContentText(artist==null?"":artist)
            .setContentIntent(session.getController().getSessionActivity()).setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true).setOngoing(playing).setCategory(Notification.CATEGORY_TRANSPORT)
            .addAction(new Notification.Action.Builder(playing?android.R.drawable.ic_media_pause:android.R.drawable.ic_media_play,playing?"مکث":"پخش",command(playing?PAUSE:PLAY,1)).build())
            .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next,"بعدی",command(NEXT,3)).build())
            .addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel,"توقف",command(STOP,2)).build())
            .setDeleteIntent(command(STOP,2)).setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0,1,2)).build();
    }
    private void update(){
        long duration=0;try{if(prepared&&player!=null)duration=player.getDuration();}catch(RuntimeException ignored){}
        session.setMetadata(new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE,title).putString(MediaMetadata.METADATA_KEY_ARTIST,artist).putLong(MediaMetadata.METADATA_KEY_DURATION,duration).build());
        session.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_PLAY_PAUSE|PlaybackState.ACTION_SEEK_TO|PlaybackState.ACTION_STOP|PlaybackState.ACTION_FAST_FORWARD|PlaybackState.ACTION_REWIND|PlaybackState.ACTION_SKIP_TO_NEXT|PlaybackState.ACTION_SKIP_TO_PREVIOUS)
            .setState(!prepared?PlaybackState.STATE_BUFFERING:wantsPlay?PlaybackState.STATE_PLAYING:PlaybackState.STATE_PAUSED,position(),wantsPlay?rate:0).build());
        ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(7104,notification());
    }
    /** Called on the main thread; resume the exact source and position in the visible WebView. */
    static Bundle snapshot(){
        AudioPlaybackService service=current;if(service==null)return null;
        Bundle state=new Bundle();state.putString("url",service.url);state.putLong("position",service.position());state.putBoolean("playing",service.wantsPlay);
        state.putString("id",service.currentId);
        return state;
    }
    static void reclaim(){AudioPlaybackService service=current;if(service!=null){service.pause();service.stopSelf();}}
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public void onTaskRemoved(Intent rootIntent){stopSelf();}
    @Override public void onDestroy(){
        current=null;handler.removeCallbacksAndMessages(null);audio.abandonAudioFocusRequest(focus);
        if(player!=null){player.release();player=null;}session.release();unregisterReceiver(noisy);stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
}
