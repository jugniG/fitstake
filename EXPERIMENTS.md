# StakeFit experiments (Flagsmith Toggle Wars, Track 01)

**Question:** does asking people for money make them quit, or make them commit?

Each experiment has an early metric (the easy win) and `first_workout_done` (the real proof).
If you only count the early metric, you ship the wrong version.

| Flag              | Type                        | Control                              | Variations                          | Exposure recorded  | Early metric        | Proof metric         |
| ----------------- | --------------------------- | ------------------------------------ | ----------------------------------- | ------------------ | ------------------- | -------------------- |
| `paywall_enabled` | multivariate                | `on` (today: setup → paywall → card) | `no_paywall` = `off` (setup → card) | setup screen loads | `challenge_created` | `first_workout_done` |
| `default_stake`   | multivariate, remote config | `10`                                 | `stake_5` = `5`, `stake_20` = `20`  | setup screen loads | `setup_completed`   | `first_workout_done` |

`paywall_enabled` is multivariate rather than a plain boolean because Flagsmith experiments
run on multivariate flags; the app reads `off` as "skip the paywall".

**Hypotheses**

1. Removing the paywall increases `challenge_created`, but the paywall increases
   `first_workout_done`: people who paid show up.
2. A $5 default increases `setup_completed`, but a $20 default increases `first_workout_done`:
   a missed day has to hurt.

## Where the code is

- `src/lib/flagsmith.server.ts`: the only Flagsmith client (server-side key, events enabled,
  2.5s timeouts, flush before responding). Any failure falls back to paywall on, $10 stake.
- `src/lib/experiments.ts`: flag, event and trait names, value parsing and fallbacks (tested).
- Exposures: `getSetupConfig` (`src/lib/server/experiments.ts`), called by the setup form.
- `setup_completed`: last setup step submitted (`setup-form.tsx` → `trackSetupCompleted`).
- `challenge_created`: first dashboard load showing a challenge Dodo activated
  (`getDashboardImpl`).
- `first_workout_done`: the user's first verified workout ever (`completeDayImpl`).
- Paywall gate: `resolveAppAccess` → reason `paywall_off`. Payment, webhook and charge code
  are unchanged.
- Identity = Better Auth user id. Trait `is_late_night` (transient) is sent from the browser's
  local hour (`LATE_HOUR = 20`).

## One-time Flagsmith setup (CLI)

Needs Flagsmith Cloud with the managed warehouse connected to the environment, and CLI v2
(`npm install -g @flagsmith/cli` on Windows). Run `flagsmith login`, then
`flagsmith init --project <project> --environment <environment key>`.

```bash
# Flags. Every variation needs a key or it records no exposures.
flagsmith feature create paywall_enabled --value on --enabled
flagsmith feature variant add paywall_enabled --value off --key no_paywall --weight 0
flagsmith feature create default_stake --value 10 --enabled
flagsmith feature variant add default_stake --value 5 --key stake_5 --weight 0
flagsmith feature variant add default_stake --value 20 --key stake_20 --weight 0
flagsmith feature get paywall_enabled --json   # note the feature id and variation ids
flagsmith feature get default_stake --json
```

Metrics (`occurrence`, higher is better), one per event:

```bash
for event in setup_completed challenge_created first_workout_done; do
  echo "{\"name\":\"$event\",\"aggregation\":\"occurrence\",\"direction\":\"up\",\"definition\":{\"version\":1,\"event\":\"$event\"}}" \
    | flagsmith api api/v1/environments/<env>/experiment-metrics/ --method POST --input -
done
```

Experiments (control takes whatever the variations don't):

```jsonc
// POST api/v1/environments/<env>/experiments/
{ "feature": <paywall_enabled id>, "name": "Paywall: quit or commit?",
  "hypothesis": "Removing the paywall raises challenge_created, but the paywall raises first_workout_done.",
  "metrics": [{ "metric": <first_workout_done id>, "expected_direction": "increase" },
              { "metric": <challenge_created id>, "expected_direction": "increase" }],
  "experiment_rollout": { "enabled": true, "rollout_percentage": 100,
    "feature_state_value": { "type": "string", "value": "on" },
    "multivariate_feature_state_values": [{ "multivariate_feature_option": <no_paywall id>, "percentage_allocation": 50 }] } }

{ "feature": <default_stake id>, "name": "Default stake: $5 vs $10 vs $20",
  "hypothesis": "A $5 default raises setup_completed; a $20 default raises first_workout_done.",
  "metrics": [{ "metric": <first_workout_done id>, "expected_direction": "increase" },
              { "metric": <setup_completed id>, "expected_direction": "increase" }],
  "experiment_rollout": { "enabled": true, "rollout_percentage": 100,
    "feature_state_value": { "type": "string", "value": "10" },
    "multivariate_feature_state_values": [
      { "multivariate_feature_option": <stake_5 id>, "percentage_allocation": 33 },
      { "multivariate_feature_option": <stake_20 id>, "percentage_allocation": 33 }] } }
```

Check in the dashboard that `first_workout_done` is the primary metric, then start each with
`POST .../experiments/<id>/start/` and confirm the status is `running`.

**Late-night segment:** create segment `late_night` with rule `is_late_night = true`. Add its
`default_stake` override (`5`) when rolling out the winner, not during the experiment: an
override during the test would take those users out of their assigned variation.

## Simulated traffic

```bash
npm run simulate -- --dry-run --users=1000   # preview the story, no network
npm run simulate -- --users=1000 --seed=7    # real exposures + events to Flagsmith
```

Rates are in `scripts/simulate-traffic.ts` (`DEFAULT_RATES`) or a JSON file via `--rates=`.
The script talks to Flagsmith directly (not through the app UI), so no logins or card
authorizations are faked. About a minute later, refresh results (once per 5 minutes):
`POST .../experiments/<id>/results/refresh/`, then `GET .../experiments/<id>/results/`.
Each variation needs 50+ exposures before results show.

## Rolling out the winner (no redeploy)

End the experiment (this unlocks the flag), then set the winning value as the flag's value for
everyone, e.g. `default_stake = 20`, and add the `late_night` segment override `default_stake = 5`.
The app reads the new values on the next request.
