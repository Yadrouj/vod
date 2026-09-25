# Player and room controls

Online video and synchronized watch/listen rooms share `MediaPlayerControls`.
The component handles presentation and gestures; it does not own the media
engine. Room actions still use server commands and room permissions, including
quality changes, speed and seeking. Scrubbing commits once on release.

## Interaction

- Desktop: click video to play/pause; double-click for fullscreen. Hover reveals
  controls, button tooltips and the timeline's time preview.
- Touch: tap video to reveal/hide controls; double-tap the left/right side to
  skip ten seconds. The center button plays/pauses.
- Hold a playing video for 2× speed; release restores the previous speed.
- Settings have separate quality/speed lists with a back button. On mobile,
  settings and voice options use a full-screen dialog with a visible close button.
- Focus the player to use K/Space, J/L, arrow keys, 0–9, Home/End, F, M, C,
  I, T, comma/period, < / > and Shift+N. `?` opens shortcut help. Shortcuts do
  not intercept typing, dialog controls or push-to-talk buttons.
- Fullscreen requests landscape orientation where the browser supports it.
  Picture-in-picture and external playback are shown only when supported.

Shortcut conventions follow [YouTube's documented keyboard controls](https://support.google.com/youtube/answer/7631406?hl=en).
The player uses Sarvnema's sources and permissions; it is not a YouTube embed.
Timeline previews currently show time, not generated video thumbnails.

## Camera and push-to-talk

Both room types have a visible microphone/camera toolbar. Nothing captures on
room entry. Enabling the microphone requests permission but leaves its track
muted. Hold the microphone button (or Space/Enter while it is focused) to talk.
Release, pointer cancellation, focus loss, hidden tabs and socket disconnection
mute it. Camera capture is separately opt-in and can be stopped from the toolbar.
Leaving a room stops the captured tracks, including late permission responses.
Host moderation and camera permissions remain enforced.

Camera uses modest resolution/frame rate for bandwidth; there is no new SDK.
WebRTC still uses `/api/watch-party/ice-config`. Production needs HTTPS for
device permissions and a working TURN configuration for restrictive networks.
The local fake-device test does not validate production NAT traversal.

## Verification

With the production app and watch-party socket server running locally:

```sh
node --import tsx --test scripts/tests/player-fullscreen.test.ts
node scripts/smoke-watch-party.mjs http://localhost:3006
LOAD_BASE_URL=http://localhost:3006 node scripts/smoke-player-room-controls.mjs
```

The browser smoke test requires Playwright and Chrome. If Playwright is installed
outside this repository, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path.
In PowerShell, set variables with `$env:LOAD_BASE_URL='http://localhost:3006'`.
The test accepts localhost only and uses fake camera/microphone devices and a
synthetic 180-second audio file. It does not read real devices or download films.

Coverage includes 320/390px layout bounds, full-screen dialogs, pointer/keyboard
controls, hold-to-speed restoration, theater mode, mobile double-tap, opt-in
capture, release/blur muting, real two-browser camera transport, synchronized
seeking, and camera track shutdown in both room types. Screenshots are saved in
the ignored `.media-cache/player-controls` directory.
