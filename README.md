# INTOTO External Ambassador POC

Standalone site for the external ambassador experience. It lives in `POC/Extrenal_POC` and does not change the admin portal or the API.

The admin portal does not use Material UI. This POC uses the INTOTO configuration colors (`#141B33`, `#3D6FB4`, `#F3F4F8`) and Inter, and talks to the same Auth0 and HTTP APIs.

## Run locally

```bash
cd POC/Extrenal_POC
npm install
npm run dev
```

Open `http://localhost:5180/external-ambassador`.

Copy `.env.example` to `.env` before using a real API. The default mode is `mock`.

The home page is public. Sign-in is optional and is only needed for a personal chat session and account actions.

- Email: `ambassador@intoto.example`
- Password: `ambassador`

```bash
npm test
npm run typecheck
npm run build
```

### Iframe parent

In a second terminal:

```bash
npm run dev:parent
```

Open `http://localhost:5199`. The parent is a different origin from the app on port 5180.

Replace the iframe `src` with the deployed URL:

```html
<iframe
  src="https://ambassador.example.com/external-ambassador"
  title="INTOTO External Ambassador"
  width="100%"
  height="800"
  allow="clipboard-write; popups"
></iframe>
```

`allow="popups"` is required for Auth0. Do not put tokens in the iframe URL.

Direct refresh of `/external-ambassador/ambassadors`, `/chat`, `/communities`, `/vendors`, and `/account` works because those are client routes on the ambassador origin.

## Live API mode

Set in `.env`:

```
VITE_AUTH_MODE=live
VITE_API_BASE_URL=http://localhost:3000
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=...
VITE_AUTH0_AUDIENCE=...
VITE_FRAME_ANCESTORS=https://parent.example.com
```

Add `http://localhost:5180` to the Auth0 application's allowed callback, logout, and web origins, and to the API `CORS_ALLOWED_ORIGINS`. The external ambassador role name is `external_ambassador`.

If Auth0 settings are missing, the app stays on the mock adapter even when `VITE_AUTH_MODE=live`.

## What is real vs mock

| Module | Mock mode | Live mode |
| --- | --- | --- |
| Login | Labeled demo account | Auth0 popup, then `GET /api/user/login`, `GET /api/portfolio/active`, `POST /api/portfolio` |
| Logout | Clears session storage | `POST /api/user/logout` plus Auth0 logout |
| Profile | Session user | `GET /api/user-profile/profile` |
| Ambassadors | JSONPlaceholder `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` | Same fake API; no INTOTO login required |
| Communities | Sample records | `POST /api/community/list`, `GET /api/community/:id`, `GET /api/community/member/joined`, `POST /api/community/member/join`, `POST /api/community/member/exit` |
| Chat | Sample thread | Socket.IO `/chat` `chatlist:fetch` and `/chatroom` `chatroom:join`, `chatroom:fetch`, `chatroom:send_msg` |
| Vendors | Sample records | Still sample records. No vendor API exists |

JSONPlaceholder does not persist writes. After a successful POST, PUT, or DELETE, this POC
updates in-memory state so the UI reflects the operation until the page is reloaded.

## Security

- Framing is `Content-Security-Policy: frame-ancestors` from `VITE_FRAME_ANCESTORS`. A production build with an empty list sends `frame-ancestors 'none'`. This app does not send `X-Frame-Options`, because that header cannot express an allow-list.
- The API already uses Helmet. Helmet's own framing headers apply to API responses, not to this UI. CORS is an API setting (`CORS_ALLOWED_ORIGINS`) and was not changed.
- Auth is a Bearer token on the ambassador origin. The parent site does not share cookies or storage with this app.
- Auth0 Universal Login cannot be displayed inside a cross-origin iframe. Live sign-in uses a popup. Refresh uses Auth0 refresh tokens stored by the Auth0 SDK in this origin's `localStorage`, not in the parent page.
- Tokens are never placed in query parameters. `postMessage` accepts only `{ type: "intoto:ping" }` from an allow-listed parent and replies with `{ type: "intoto:ready", version: 1 }` to that exact origin. Messages that include tokens or identity claims are ignored.
- A 401 triggers one shared refresh. If refresh fails, the session is cleared and protected routes return to login.
- Logout sends `Authorization`, `refid`, `refresh-token`, and `x-device-id`, matching `POST /api/user/logout`.

## Tests that need a real backend

Automated tests use the mock adapter and a fake `fetch`. Still check manually:

- Auth0 popup from `http://localhost:5199` and from a direct visit to port 5180
- Refresh of a nested route inside the iframe
- An origin that is not in `VITE_FRAME_ANCESTORS` (the browser should refuse to display the frame)
- Community join/leave and chat send against a user whose active role is `external_ambassador`
- API CORS from `http://localhost:5180`

## Production blockers

- Approve parent origins and set them in `VITE_FRAME_ANCESTORS` at deploy time.
- Allow this origin in Auth0 and in API CORS. Serve the app over HTTPS.
- Confirm the external ambassador role has `read:community`, `write:community`, and chat scopes before join/leave and chat will succeed.
- Add a real vendor API before showing vendor contact details to external users. Do not ship the sample vendor records.
- Confirm Socket.IO polling from this origin is allowed by the API gateway.
- Add monitoring around login failures, 401 refresh failures, and chat disconnects.
- This POC is not production-ready. Mock mode must be off, and vendor data must come from an authorized API, before a production launch.
