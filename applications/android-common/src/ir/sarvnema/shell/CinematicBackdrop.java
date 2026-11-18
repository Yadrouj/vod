package ir.sarvnema.shell;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.os.SystemClock;
import android.util.AttributeSet;
import android.view.View;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Offline, bounded-memory cinema art. No network, video decoder, sound or native bridge. */
public final class CinematicBackdrop extends View {
    private final Paint imagePaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Paint shadePaint = new Paint(), beamPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Matrix imageMatrix = new Matrix(), beamMatrix = new Matrix();
    private Bitmap[] images;
    private Shader shade, vignette, beam;
    private boolean running, loading;
    private volatile boolean released;
    private long elapsed, startedAt;
    private final ExecutorService loader = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "sarvnema-startup-art"); thread.setDaemon(true); return thread;
    });
    private final Runnable frame = new Runnable() {
        @Override public void run() {
            if (!running || released) return;
            invalidate(); postDelayed(this, 33); // At most 30fps, even on 120Hz phones.
        }
    };

    public CinematicBackdrop(Context context, AttributeSet attrs) {
        super(context, attrs); setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }
    @Override protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (loading || released) return;
        loading = true;
        loader.execute(() -> {
            Bitmap[] decoded = new Bitmap[3];
            for (int i = 0; i < decoded.length && !released; i++) {
                int id = getResources().getIdentifier("startup_scene_0" + (i + 1), "drawable", getContext().getPackageName());
                if (id == 0) continue;
                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inScaled = false; options.inPreferredConfig = Bitmap.Config.RGB_565;
                try { decoded[i] = BitmapFactory.decodeResource(getResources(), id, options); }
                catch (RuntimeException | OutOfMemoryError ignored) { /* Dark gradient is a valid low-memory fallback. */ }
            }
            if (!released) post(() -> { if (!released) { images = decoded; invalidate(); } });
        });
    }
    @Override protected void onSizeChanged(int width, int height, int oldWidth, int oldHeight) {
        if (width < 1 || height < 1) return;
        shade = new LinearGradient(0, 0, 0, height,
            new int[] { 0x99070A10, 0x6E070A10, 0xC7070A10, 0xF2070A10 },
            new float[] { 0f, .25f, .68f, 1f }, Shader.TileMode.CLAMP);
        vignette = new RadialGradient(width * .5f, height * .47f, Math.max(width, height) * .55f,
            new int[] { 0xC2070A10, 0x68070A10, 0xD9070A10 }, new float[] { 0, .65f, 1 }, Shader.TileMode.CLAMP);
        beam = new RadialGradient(0, 0, Math.max(width, height) * .65f,
            new int[] { 0x24F2D080, Color.TRANSPARENT }, null, Shader.TileMode.CLAMP);
    }
    @Override protected void onDraw(Canvas canvas) {
        canvas.drawColor(0xFF070A10);
        long time = elapsed + (running ? SystemClock.uptimeMillis() - startedAt : 0);
        float drift = StartupMotion.drift(time);
        if (images != null) {
            int current = StartupMotion.scene(time, images.length);
            drawScene(canvas, images[current], 255, drift);
            float blend = StartupMotion.blend(time);
            if (blend > 0) drawScene(canvas, images[(current + 1) % images.length], Math.round(255 * blend), drift);
        }
        shadePaint.setShader(shade); canvas.drawRect(0, 0, getWidth(), getHeight(), shadePaint);
        shadePaint.setShader(vignette); canvas.drawRect(0, 0, getWidth(), getHeight(), shadePaint);
        if (beam != null) {
            beamMatrix.setTranslate(getWidth() * (.15f + drift * .4f), getHeight() * .15f);
            beam.setLocalMatrix(beamMatrix); beamPaint.setShader(beam);
            canvas.drawRect(0, 0, getWidth(), getHeight(), beamPaint);
        }
    }
    private void drawScene(Canvas canvas, Bitmap bitmap, int alpha, float drift) {
        if (bitmap == null) return;
        float cover = Math.max(getWidth() / (float) bitmap.getWidth(), getHeight() / (float) bitmap.getHeight());
        float scale = cover * (1.06f + drift * .035f);
        float x = (getWidth() - bitmap.getWidth() * scale) * (.45f + drift * .1f);
        float y = (getHeight() - bitmap.getHeight() * scale) * .5f;
        imageMatrix.setScale(scale, scale); imageMatrix.postTranslate(x, y);
        imagePaint.setAlpha(alpha); canvas.drawBitmap(bitmap, imageMatrix, imagePaint);
    }
    public void resumeMotion() {
        if (released || running) return;
        running = true; startedAt = SystemClock.uptimeMillis(); removeCallbacks(frame); post(frame);
    }
    public void pauseMotion() {
        if (running) elapsed += SystemClock.uptimeMillis() - startedAt;
        running = false; removeCallbacks(frame);
    }
    public void release() {
        pauseMotion(); released = true; loader.shutdownNow(); images = null;
        // Let Android release bitmaps after any recorded hardware frame; never recycle a bitmap still in use.
    }
    @Override protected void onDetachedFromWindow() { pauseMotion(); super.onDetachedFromWindow(); }
}
