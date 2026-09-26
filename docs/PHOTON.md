# Photon-only Mission Control

The advisor uses a curated library of inspection hints and **Photon Spectrum 12.10.1** for messaging. It makes no calls to OpenAI or any other model provider. This is a contextual game advisor, not a general-purpose generative chatbot. The separate final-report/evaluation subsystem is outside this change and does not supply Photon answers.

Players can ask in the game or reply in Messages. Both use the same mission session, fuzzy telemetry, and allowance of **two question attempts per turn**. Level 2 turn 1 has its own allowance rather than reusing level 1 turn 1. Automatic milestone messages have a separate existing cap of 25 per mission. Photon cannot perform player actions or access the map.

## 1. Get the correct Photon credentials

1. Sign in at [app.photon.codes](https://app.photon.codes/) and open or create the Spectrum project for this game.
2. Open that project's **Settings**. Copy its **PROJECT_ID** and **SECRET_KEY/project secret**.
3. In this repository, put PROJECT_ID into `PHOTON_PROJECT_ID` and the project secret into `PHOTON_API_KEY`. The latter is our environment-variable name for Spectrum's `projectSecret`; a dashboard login token or an unrelated API key is not a substitute.
4. Enable/provision the project's iMessage platform and register the test recipient in the project's Users/connection flow when using a shared line. A project credential alone does not prove that a recipient can be routed. Use an address that can receive the service enabled for your Photon line; test with Apple's Messages app for iMessage. Entering a phone number in the game does not activate iMessage for that number.

The credential mapping follows [Photon's SDK setup](https://photon.codes/docs/spectrum-ts/getting-started) and [Spectrum authentication](https://photon.codes/docs/api-reference/introduction). See [connection and routing](https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing) for shared versus dedicated lines. No paid upgrade is automatically enabled by this code.

## 2. Configure local and deployed environments

On your Mac, open a Terminal in the repository. If you do not already have `.env.local`, copy `.env.example` to `.env.local`. Edit the existing file rather than overwriting your other settings.

```dotenv
PHOTON_PROJECT_ID=your-spectrum-project-id
PHOTON_API_KEY=your-spectrum-project-secret
PHOTON_WEBHOOK_SECRET=the-signing-secret-from-step-3
MISSION_SESSION_SECRET=a-private-random-value-at-least-32-characters
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_URL=https://your-deployment-domain
```

Generate the session secret locally with `openssl rand -hex 32`, then paste the result into `MISSION_SESSION_SECRET`. The existing Supabase database stores encrypted messaging sessions, deduplication records, and question counts. Keep it configured; Photon provides the messaging transport. The existing `SUBMISSION_HASH_SECRET` can also be set to a separate random value for enrollment quota hashing.

Use these exact uppercase variable names. Never put secrets in a `NEXT_PUBLIC_*` variable. `.env.local` is ignored by Git. Add the same values to the hosting project's server environment for this branch's deployment and redeploy after changing them. Restart the local server after changing `.env.local`.

The older `SPECTRUM_PROJECT_ID`, `SPECTRUM_PROJECT_SECRET`, and `SPECTRUM_WEBHOOK_SECRET` names still work as aliases. `PHOTON_*` takes precedence; leave the aliases empty for a new setup. No `OPENAI_KEY` or `OPENAI_API_KEY` is needed for any Photon endpoint.

## 3. Register the inbound webhook

In your Photon project, register this final HTTPS URL in the **Webhook** tab:

```text
https://your-deployment-domain/api/mission-control/webhook
```

Save the returned signing secret as `PHOTON_WEBHOOK_SECRET`. This value is separate from the project secret and is shown at webhook creation. Redeploy with it in the environment. Use a public HTTPS endpoint that does not redirect or require Vercel login; deployment protection must allow this webhook to reach the application. Do not register `localhost`. Local inbound testing requires a public HTTPS tunnel pointed at the local server.

Replace `your-deployment-domain` with the real address where this Photon branch is deployed, and set `NEXT_PUBLIC_APP_URL` to that address without a path or trailing slash. A literal example hostname such as `your-deployed-domain` cannot receive webhooks. The setup checker verifies the exact registered URL and checks that a public GET to the webhook route returns HTTP 405 (the route accepts POST only). If you previously registered a placeholder URL, remove it in Photon and add the real one; save the new signing secret and redeploy.

[Photon's webhook guide](https://photon.codes/docs/webhooks/managing-webhooks) describes registration and recovery if you lost the signing secret. Our handler verifies the signature over the original body, rejects stale deliveries, and deduplicates inbound message IDs.

## 4. Apply the SQL migrations

Use the existing Supabase project's SQL Editor or your team's migration workflow to apply `supabase/migrations` in filename order. Never skip the earlier session migration. The relevant files are:

- `202609260003_mission_control.sql`: encrypted sessions, enrollment limits, webhook deduplication, and advice history.
- `202609270001_photon_advice_quota.sql`: per-turn question counts from the earlier Photon branch.
- `202609270002_photon_session_limits.sql`: binds the question claim to an active, unexpired session and its current turn, shared by the game and webhook.

The new migration replaces the earlier claim function without deleting its table or changing any existing data. These tables have RLS enabled and are accessed using the server's service-role client.

## 5. Check setup, then play

With Node.js 24 installed, run:

```sh
npm install
npm run photon:check
npm run dev
```

`photon:check` is read-only: it checks configuration, authenticates against Photon, looks for the webhook registration, and checks database table access. It prints no secret values and sends no messages. It cannot prove that the signing secret matches, the deployment permits webhook traffic, or the SQL functions were applied correctly.

Open `/game`, expand **Mission Control via iMessage (optional)**, enter your registered address, and launch. Verify the welcome arrives in Messages. Place a habitat and begin operations. Ask a question in the Photon panel: the hint should appear in the game and Photon should send it to Messages. Reply in Messages: the signed webhook should generate another contextual hint, and the history/remaining allowance should update in the game within a few seconds.

Confirm that a third question in the same turn produces no extra hint, a new turn restores the allowance, and a communications outage stops new advice. A powered, connected communications backup can keep the link working under the existing simulation rules. History stays visible during outages. Questions asked while on standby, after completion, or during a link outage do not receive advice.

## Failure behavior and remaining verification

A successful SDK send is reported as **accepted**, not proof that the player received or read it. Failed send attempts use one of the two slots; a provider retry can use the remaining slot. If delivery succeeded but saving history failed, the browser reports that separately and does not resend the message. History polling exposes only advice and quota data, requires the session token, and never returns the encrypted recipient or credentials.

The game panel requires a linked Photon session. It does not silently fall back to another model provider. Unknown questions get an in-character request to ask about an outpost system; requests for a guaranteed solution get a brief role reminder. This deliberately sacrifices open-ended conversation to keep the advisor bounded and Photon-only.

Sessions expire after two hours. The existing enrollment guard permits three runs per requester per day and 100 globally; repeated failed enrollment attempts can use that allowance. If setup fails, fix the keys, line, or migrations before starting another run. Creating a session is not proof that an inbound reply will reach the webhook: the full deployed send/reply/receive loop must be checked with your actual Photon account.
