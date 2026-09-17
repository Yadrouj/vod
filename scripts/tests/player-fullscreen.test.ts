import test from "node:test";
import assert from "node:assert/strict";
import { enterPlayerFullscreen } from "../../lib/player-fullscreen";

test("mobile fullscreen locks landscape after entering and unlocks on exit; unsupported rotation stays fullscreen", async () => {
  const original = Object.fromEntries(["window", "document", "screen"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const events = new EventTarget(), calls: string[] = [];
  const document = Object.assign(events, { fullscreenElement: null as unknown });
  let coarse = true, reject = false;
  const element = { requestFullscreen: async () => { calls.push("fullscreen"); document.fullscreenElement = element; } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { matchMedia: () => ({ matches: coarse }) } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "screen", { configurable: true, value: { orientation: {
    lock: async (value: string) => { calls.push(value); if (reject) throw Error("Not supported"); }, unlock: () => calls.push("unlock"),
  } } });
  try {
    await enterPlayerFullscreen(element as unknown as HTMLElement);
    assert.deepEqual(calls, ["fullscreen", "landscape"]);
    document.fullscreenElement = null; events.dispatchEvent(new Event("fullscreenchange"));
    assert.equal(calls.at(-1), "unlock");
    reject = true;
    await enterPlayerFullscreen(element as unknown as HTMLElement);
    assert.equal(document.fullscreenElement, element);
    calls.length = 0; coarse = false;
    await enterPlayerFullscreen(element as unknown as HTMLElement);
    assert.deepEqual(calls, ["fullscreen"]);
  } finally {
    for (const [key, descriptor] of Object.entries(original)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});
