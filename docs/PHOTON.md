# Photon Mission Control

Photon is the in-game Earth-side advisor shown during mission operations. It can offer short hints, but it cannot dispatch `PlayerAction`s or change simulation state.

## Runtime behavior

- Players can send at most two questions for each run and turn. The API reserves quota in Supabase before calling the model, so refreshing the page does not restore a used transmission. Failed model attempts consume a transmission too.
- Communications hazards disable the composer and the API rejects new requests.
- The model receives the turn, mode, and coarse categories for water, power, oxygen, temperature, and agriculture. It does not receive exact resource values, modules, utility links, or the full map.
- The advisor is generated through the server-side OpenAI integration. `PHOTON_API_KEY` and `PHOTON_PROJECT_ID` are not used for this in-game web chat.

## Setup

1. Configure `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` on the server. Keep the service-role key private; never prefix it with `NEXT_PUBLIC_`.
2. Apply `supabase/migrations/202609270001_photon_advice_quota.sql` to the same Supabase project. It creates the quota table and a service-role-only atomic claim function.
3. Deploy the application and test the loop in `/game`: start a mission, begin operations, ask Photon twice in one turn, confirm the third request is refused, advance a turn, then confirm the allowance resets. Trigger a communications outage to verify the offline state.

If either OpenAI or the quota service is unavailable, Mission Control reports a transmission failure; the game remains playable. The externally routed Photon Spectrum/iMessage channel and its webhook are separate integrations and are not exercised by this in-game advisor.
