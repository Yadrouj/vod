# Mobile discovery, subtitles and room cameras

The landing header search icon and mobile search navigation open the same dialog. On phones it fills the available visual viewport, including when the keyboard is open. Category changes retain the query. All searches film/series and music concurrently; film/series suggestions retain descending IMDb order. Individual categories query their own catalogues.

## Subtitles

- **Subtitles:** shows the successfully loaded track, available embedded/included/online tracks, Persian/English filters, automatic selection, local files and direct SRT/VTT URLs. A failed online search is distinct from finding no matches.
- **Sync:** Earlier/Later adjust by 0.5 seconds; the numeric field allows 0.1-second precision up to ±120 seconds. Reset restores original timestamps. This applies to embedded text cues as well as loaded subtitle files, without accumulating offsets.
- **Style:** live preview, text size, text/background colors and independent opacity controls. Appearance is stored locally in this browser. Burned-in subtitles cannot be restyled. Native OS video players may impose their own caption appearance.
- A room shares subtitle selection through the existing host permissions. Timing and appearance are personal; guests can adjust those without changing everyone else's subtitles.

## Camera and voice

Drag the entire camera tile with a mouse or finger. Positions are contained within the player after resizing or entering fullscreen. Arrow keys move a focused tile; Home/double-click resets it. The voice options panel also resets all camera positions.

Camera and microphone remain separate opt-in actions. Push-to-talk mutes on release, pointer cancellation, blur, hidden document or disconnect. Permission errors open the help panel; camera denial does not prevent using the microphone. If mobile autoplay blocks remote audio, a button lets the participant enable it. Access revocation returns the affected control to its retry state.

## Source recovery

Donyaye Serial sources show Iranian-IP/VPN guidance and up to two available alternatives for the same episode from other providers. A failed media element is replaced on retry; rejected play promises from old elements cannot overwrite the new source. Room source changes still follow host permissions.

## Verification

```sh
node --import tsx --test scripts/tests/subtitle-preferences.test.ts scripts/tests/playback-help.test.ts
node scripts/smoke-discovery-subtitles.mjs
node scripts/smoke-player-room-controls.mjs
npm run build
```

The browser scripts use a **local** server (`LOAD_BASE_URL`) and Chrome through Playwright (`PLAYWRIGHT_MODULE` if installed outside this project). They intercept media/subtitles with synthetic fixtures; camera/microphone tests use fake devices. Tested widths include 320, 390, 844 and 1440 pixels. Real-device iOS permission prompts, native fullscreen captions and carrier-specific media availability still need device testing.
