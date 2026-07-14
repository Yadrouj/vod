# SarvNema Watch Together

Watch Together uses a persistent Socket.IO server attached to the same HTTP server as Next.js. Run the application with the project scripts; do not start it with `next dev` or `next start` directly.

```bash
npm run dev
npm run build
npm run start
```

The application remains on port `3004` unless `PORT` is set.

## Room flow

1. Open a title's `/watch/[id]` page.
2. Click **Watch together**.
3. Enter a browser profile or use Telegram Login.
4. Share the generated `/watch-together/[roomId]?invite=...` URL.
5. Invitees enter with a saved browser profile or a verified Telegram profile.

The room owner controls playback by default. Guest permissions can be enabled globally or overridden per participant for play/pause, seeking, source changes, movie changes, queue management, chat, and reactions.

## Synchronization

The server owns playback state and timestamps every revision. Clients request an authoritative state every two seconds and correct drift when it exceeds 350 ms. Play, pause, seek, source, speed, and media changes are broadcast to every connected participant.

## Telegram Login

Set these values in `.env.local`:

```env
BOT_API_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=Sarvnema_bot
```

Telegram Login also requires the production domain to be registered for the bot through BotFather's `/setdomain`. Login payloads are verified server-side using Telegram's HMAC signature before profile data is accepted.

## Runtime and scaling

Rooms currently live in the single Node.js process and expire 12 hours after the room becomes inactive. This matches the current single-instance deployment. For multiple application instances, replace the in-memory room map with Redis and configure the Socket.IO Redis adapter so all instances share room events and state.

## Security behavior

- Room entry requires both the room ID and cryptographically random invite token.
- Chat input is rendered as text by React.
- Host-only checks are enforced on the server, not only in the UI.
- Blocked browser/Telegram profile IDs cannot rejoin the room with the same identity.
- A participant's local mute list remains private to their browser.
