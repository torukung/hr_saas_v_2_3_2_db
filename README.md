# Adeptio Adaptive HR — Platform UI · v2.3.2.db

> **v2.3.2.db — the resilient data layer, integrated.** The v2.3.1.essential design contract now runs on a working implementation of **Structure Blueprint v2.3.2 (resilient data layer)**: ten split stores, one writer each, persisted **per tenant × store** (`phoungern-people`, `phoungern-payroll`, …). Everything you add, approve or delete survives a reload. Every write becomes a fact on `db_audit` (§05 sync path). The B1/B2/B3 backup ladder is live — snapshot **now**, on **schedule**, **selectable** per store, **customizable** per module — with restore, restore drills and `dw_reports` replay. Both tiers (Essential ≤50 / Pro ≤250) run on the same database; `db_docs` provisions lazily at Growth+ (§02: flags decide which stores exist).
>
> Carried forward unchanged: the topbar persona menu, the **Essential / Pro tier toggle** (R4 — flags, not forks), all 66 v2.3.1 screens, web + mobile frames, Atelier Pastel. `?tier=professional` still sets the flag at load. Verify with `node tools/smoke.js .` (renders 146 screens under both tiers + data-layer integrity checks).

**What this is.** A real, workable demo: a static site (no backend, no build step) whose "physical unit" is one persisted store per tenant × module — localStorage standing in for Turso/SQLite exactly where the blueprint puts it. The structure, naming, registry, backup ladder and blast-radius behavior are 1:1 with Blueprint v2.3.2, so the build phase swaps the engine, not the design.

## Run / deploy

Local: double-click `index.html` (everything is relative-path, file:// safe — data persists per browser).

GitHub Pages: push this folder as a repo → Settings → Pages → deploy from branch → root. `.nojekyll` is included.

## Cloud sync (Turso) — optional, hybrid offline-first

Out of the box the app is **self-sustaining per browser**: each visitor's data lives in their own localStorage. To make it a *shared, durable* database, fill in `js/turso-config.js` and the hybrid sync layer (`js/turso-sync.js`) goes live:

- **localStorage stays the working cache** — instant UI, still works offline and on `file://`
- every `DB.persist()` lands in a localStorage **outbox**, then pushes that store's table group to Turso (one DB, ten prefixed groups: `people_employees`, `time_punches`, `audit_events`, …)
- **on load**, `sync_meta.updated_at` is compared per store against the local envelope — last-writer-wins at store granularity; newer cloud stores hydrate in and the UI re-renders
- offline writes queue and drain on reconnect; a ☁ badge (bottom-right) shows sync state and force-syncs on click
- empty config → zero network calls, exactly the old behavior

Provision:

```bash
turso db create adeptio-hr-v232
turso db show adeptio-hr-v232 --url        # → url for js/turso-config.js
turso db tokens create adeptio-hr-v232     # → token for js/turso-config.js
```

Tables are created automatically on first sync. Verify the layer without a network: `node tools/sync-smoke.js .`

> ⚠ The token ships to every visitor's browser — scope it to this one database and treat the deployment as a pilot/demo. For production, put writes behind an edge function so the token stays server-side.

## The database, in 60 seconds

| Store | Layer | Holds | Writer |
|---|---|---|---|
| `db_people` | L-OP | employees · divisions | People cell |
| `db_time` | L-OP | punches | Time cell |
| `db_leave` | L-OP | leave types · balances | Leave cell |
| `db_workflow` | L-OP | the shared-ID request ledger (LV/OT/EX/TC) | Workflow cell |
| `db_payroll` | L-OP | payslips · pay runs | Payroll cell |
| `db_comms` | L-OP | templates · channels · sent log | Comms cell |
| `db_docs` | L-OP+L-CU | document metadata (Growth+ — lazily provisioned) | Docs cell |
| `db_audit` | L-OP→L-CU | append-only facts (refuses deletes) | Event bus |
| `dw_reports` | L-DR | org snapshots · chart series (derived — refuses direct writes, rebuilds by replay) | Projector |
| `db_platform` | global | placement registry · backup policies · drill log | Kernel |

Sample rows everywhere are **addable and deletable** (inline forms / row × buttons) so the split-store model can be understood by touching it. Reseed any store — or all — from the Database Studio.

## DB management — every level of user

- **System Admin → Database studio**: the whole platform. Store cards (rows · KB · backup cadence), per-store drill-down with table editors, provisioning grid (tenant × store ●/○), placement registry, reseed.
- **System Admin → Backups & restore**: the full backup center (below).
- **HR → Data manager**: scoped studio over the stores HR's cells own (`db_people`, `db_leave`, `db_workflow`, `db_payroll`, `db_comms`) with per-module snapshot / restore / reseed. On Essential, HR doubles for the locked Admin persona — this is the whole DB console a ≤50 site needs.
- **Manager → Team data**: the team's slice of `db_people` + `db_workflow`; add a member to Line A and watch the roster, attendance board and schedule update — one write, many lenses.
- **Staff → My data**: their own rows across stores (withdraw pending requests, manage own docs), plus "where my data lives".
- **CEO → Data room**: read-only — `dw_reports` projections, drill results, custody posture. No row-level records at this altitude.

## Backup module (Blueprint §06 — three layers deep)

- **Now**: Back up now with per-store checkboxes (selectable), optional label; snapshots land in the custodial area (L-CU) with restore / download (portable JSON — the "plain SQLite file" of this demo) / expire.
- **Scheduled**: per-module frequency (`off · hourly · 6-hourly · nightly · daily-worm · weekly · monthly`), enable/disable per store, custody + retention shown per row. The scheduler ticks every minute and catches up on load — overdue stores export immediately.
- **Cross-customizable per module**: payroll keeps its **pre-run branch** (taken automatically at the approve step of a pay run), audit exports **WORM**, `dw_reports` declares *rebuild > restore*, `db_platform` runs 6-hourly.
- **Restore**: whole snapshot, or one store from the newest snapshot containing it — restoring one module never rewinds another (blast radius = 1 module × 1 tenant).
- **Drills & replay**: "Run restore drill" (P5) branches a random store and verifies integrity/rows/checksums into the drill log; "Rebuild dw_reports" demonstrates B3 replay from the audit ledger.

## Structure

```
index.html              entry — loads everything, no bundler
css/tokens.css          design tokens (Atelier Pastel + persona accents)
css/app.css             all component & shell styles (+ v2.3.2.db studio styles at the end)
js/i18n.js              EN live · ລາວ staged
js/ui.js                icon set, components, hand-rolled SVG charts
js/db.js                ★ the data layer — 10 stores, persistence, CRUD, audit facts,
                          backup ladder, scheduler, drills, replay (THE ENGINE SEAM:
                          build phase points these calls at Turso per the registry)
js/data.js              DATA — now a thin lens over DB; same screen-facing API as v2.3.1
js/screens/dbviews.js   ★ shared DB-management views (store grid, table editor, backup center)
js/screens/staff.js     Staff (ESS) — ochre        (+ My data)
js/screens/manager.js   Manager (MSS) — sage       (+ Team data)
js/screens/hr.js        HR (People Ops) — blue     (+ Data manager; directory reads db_people)
js/screens/ceo.js       CEO — plum · read-only     (+ Data room)
js/screens/sysadmin.js  System Admin — teal        (+ Database studio · Backups & restore)
js/app.js               router, shells, action handlers (+ db-*, backup-*, drill, export)
tools/smoke.js          renders all 146 screens both tiers + DB integrity checks — `node tools/smoke.js .`
```

## Try this first

1. **Manager → Approvals**: approve `LV-0481` → **reload the page** — it stays approved (B1: every commit persists).
2. **Manager → Team data**: add a member with team `Line A` → check Overview and Schedule.
3. **System Admin → Backups & restore**: Back up now (all stores) → delete some rows anywhere → Restore the snapshot.
4. **HR → Data manager → db_payroll**: snapshot the module alone; advance pay run `PR-2026-06` past review and watch the automatic *pre-run branch* appear in history.
5. **System Admin → Audit log**: every one of the actions above is sitting at the top of the tail.

Routing, menu depth, the mobile contract and persona boundaries are unchanged from v2.3.1 — see the archived README in `Backups/v.2.3.1.essential — backup 2026-06-11/`.
