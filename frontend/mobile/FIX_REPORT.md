# Fix Report: `TypeError: constructor is not callable` in `services/echo.ts`

## Bug
```
ERROR  [TypeError: constructor is not callable]

Code: echo.ts
  37 |   const EchoConstructor = (Echo as any).default || Echo;
  38 |
> 39 |   echoInstance = new EchoConstructor({
     |                                     ^
  40 |     broadcaster: 'pusher',
  41 |     key: REVERB_KEY,
  42 |     wsHost: REVERB_HOST,
Call Stack
  getEcho (services/echo.ts:39:37)
  useEffect$argument_0 (hooks/useMatchChannel.ts:63:25)
```

## Stack / Version Context
- React Native app bundled with Metro.
- `package.json` ships `laravel-echo: ^2.3.7`.
- `laravel-echo@2.x` is published as CommonJS. Its `dist/echo.common.js` ends with:
  ```js
  exports.Channel = h;
  exports.Connector = r;
  exports.EventFormatter = u;
  exports.default = S;   // S is the actual Echo class
  ```
- The current import is `import Echo from 'laravel-echo';`.

## Root Cause
Under Metro's ESM ↔ CJS interop, `import Echo from 'laravel-echo'` does not always unwrap to the `default` export. Depending on resolution path, `Echo` can come through as the **module namespace object**:

```js
{ default: S, Channel: h, Connector: r, EventFormatter: u, __esModule: true }
```

That namespace is **not callable**, so `new Echo(...)` throws `TypeError: constructor is not callable`.

The current fallback:
```ts
const EchoConstructor = (Echo as any).default || Echo;
```
…only rescues the case where `Echo` is the namespace (`Echo.default` is the class). It does **not** rescue the case where `Echo` is itself already the class (so `.default` is `undefined`) **and** it does not rescue the case where Metro hands back something exotic. In the failing trace, the namespace is being handed back, `.default` is `undefined`, and we fall through to `new Echo(...)` — which is the namespace, hence the crash.

In short: the resolution is bundler-environment-dependent and brittle.

## Constraints
- Approval required before changing code.
- No overengineering — minimal, targeted fix.

## Approach

Use `require()` to import `laravel-echo`. `require()` always returns the real CommonJS `module.exports`, so `.default` is reliably the `S` class regardless of Metro interop quirks. This removes the resolution ambiguity without adding new abstractions.

### Changes (only `services/echo.ts`)

1. Replace the `import Echo from 'laravel-echo';` line with:
   ```ts
   const Echo = require('laravel-echo').default;
   ```
2. Remove the `EchoConstructor` indirection and construct `Echo` directly:
   ```ts
   echoInstance = new Echo({ ... });
   ```

### Why `require()` over alternatives

- **Stays a one-file change.** No Metro config edits, no dependency bumps, no new helpers.
- **Deterministic resolution.** `require()` returns the real `module.exports`, so `.default` is always the class.
- **Matches what other React Native + CJS-default-export packages do** when interop misbehaves (e.g. several `pusher-js`-style libs).

### Alternatives considered and rejected

- **`import * as Echo from 'laravel-echo'`** — same interop surface; same failure mode is still possible.
- **A multi-path resolver helper** (`Echo.default || Echo.Echo || Echo…`) — overengineered for one buggy import.
- **Bumping `laravel-echo` or adding Metro `resolver` config** — out of scope; only `echo.ts` is broken.
- **Switching broadcasters or removing Echo entirely** — changes product behavior, not a fix.

## Risk / Regression Notes
- The constructed options object (`broadcaster`, `key`, `wsHost`, `wsPort`, `forceTLS`, `authEndpoint`, `auth.headers`, etc.) is unchanged, so connection behavior and the private-channel auth flow are identical.
- `echoInstance` type stays `Echo<'pusher'>`; nothing downstream needs to change.
- `hooks/useMatchChannel.ts` and any other callers of `getEcho()` are unaffected.

## Verification Plan
1. Rebuild Metro (`expo start -c` / native rebuild) to clear any cached module graph.
2. Open the Matches screen → enter a conversation → confirm no red box and that the WebSocket subscription is attempted (check Reverb server logs for an incoming connection from the device).
3. Send a test message from the other side → confirm `useMatchChannel`'s `.message.sent` listener fires (logs or UI update).
4. Confirm `getEcho()` still returns a singleton on subsequent calls.

## Files Touched
- `services/echo.ts` — 2 small edits (import line + construction line). Nothing else.