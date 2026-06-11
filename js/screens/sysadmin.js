/* ============================================================
   ADEPTIO · SYSTEM ADMIN persona — teal · platform only
   Web: Health · Templates(→editor) · Channels · Roles ·
        Integrations · Audit
   Mobile (alerts-first): Health · Templates · Audit
   Never shows employee records or pay — by design.
   ============================================================ */
(function () {
  const { icon, kpi, card, badge, idtag, rowitem, rowlist, table, steps, empty, sparkline, donut } = UI;

  function templateRows(device) {
    return table(
      [{ h: "Template" }, { h: "Kind" }, { h: "Lang" }, { h: "v" }, { h: "Status" }, { h: "", r: 1 }],
      DATA.templates.map(tp => ({
        go: `sysadmin/${device}/template/${tp.id}`,
        cells: [`<span class="strong">${tp.name}</span> <span class="small muted">${tp.id}</span>`, tp.kind, tp.lang, `<span class="num">${tp.v}</span>`, badge(tp.status), icon("chevR")]
      })));
  }

  /* ---------- WEB ---------- */
  const web = {
    health() {
      return {
        title: "Platform health", sub: "The control plane at a glance — channels, integrations, sessions and the audit pulse.",
        actions: `<button class="btn soft" data-act="comms-test-all">${icon("plug")} Test gateways</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Delivery rate", "99.1%", "email · SMS · push blended", { hero: 1 })}
          ${kpi("Uptime", "99.98%", "30-day rolling")}
          ${kpi("SSO success", "99.4%", "12 failures today")}
          ${kpi("Active sessions", "212", "logins today · 241")}
        </div>
        <div class="grid cols-3" style="margin-top:16px">
          <div class="span-2" style="display:flex;flex-direction:column;gap:16px">
            ${card("Needs attention", rowlist([
          rowitem({ icon: "x", title: "LINE OA webhook — down", sub: "since 09:31 · failover active · HR notified", side: `<button class="btn xs soft" data-act="comms-reconnect:line-oa-bridge">Reconnect</button>` }),
          rowitem({ icon: "alert", title: "SMS sender ID cert — expiring", sub: "LaoTel · renew by Jul 01", side: badge("expiring") }),
          rowitem({ icon: "file", title: "2 templates awaiting review", sub: "TPL-023 · TPL-026", side: `<button class="btn xs ghost" data-go="sysadmin/web/templates">Review</button>` }),
          rowitem({ icon: "key", title: "1 role request", sub: "manager → team reports scope", side: `<button class="btn xs ghost" data-go="sysadmin/web/roles">Decide</button>` })
        ]), { icon: "bell" })}
            ${card("Audit pulse — events today", sparkline([84, 96, 122, 141, 138, 156, 149, 171, 162, 178], { h: 84 }) + `<div class="small muted" style="margin-top:8px"><b class="num" style="color:var(--ink)">1,204</b> events · append-only ledger (db_audit) · 0 anomalies</div>`, { icon: "pulse", link: "sysadmin/web/audit" })}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Channels", rowlist(DATA.channels.map(c => rowitem({ icon: c.status === "live" ? "check" : "x", neutral: c.status !== "live", title: c.name, sub: c.id, side: badge(c.status) }))), { icon: "plug", link: "sysadmin/web/channels" })}
            ${card("Boundary", `<p class="small muted">This persona administers the platform <b>beneath</b> the ledger — templates, channels, roles, audit. It never reads employee records or pay. Modules 11–12 <i>are</i> the shared kernel, with this console on top.</p>`, { icon: "lock" })}
          </div>
        </div>`
      };
    },

    templates() {
      return {
        title: "Content & templates — CMS", sub: "Author once, reuse everywhere: letters, emails, SMS, custom frames — versioned draft → review → publish.",
        actions: `<button class="btn" data-act="comms-new-template">${icon("plus")} New template</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Published", "14", "in the library", { hero: 1 })}
          ${kpi("In review", "1", "TPL-023")}
          ${kpi("Drafts", "1", "TPL-026")}
          ${kpi("Bilingual", "12 / 16", "EN · ລາວ pairs")}
        </div>
        ${card("Library", templateRows("web"), { icon: "files" })}
        ${card("Who consumes these", `<p class="small muted">HR composes <i>from</i> published templates (communication + documents) but can't rewrite the master. Automated notifications — payslip ready, leave approved, doc expiry — draw from the same versioned source, so manual and automatic sends stay on-brand together.</p>`, { icon: "send" })}`
      };
    },

    template(id) {
      const tp = DATA.templates.find(x => x.id === id) || DATA.templates[0];
      const isPub = tp.status === "published";
      return {
        title: tp.name, sub: `${tp.kind} · ${tp.lang} · version ${tp.v} — merge fields resolve from the people-ledger at send time.`,
        crumbs: [{ label: "Templates", go: "sysadmin/web/templates" }, { label: tp.id }],
        actions: `${idtag(tp.id)} ${badge(tp.status)}`,
        body: `
        <div class="grid cols-3">
          <div class="card span-2">
            <div class="card-head"><span class="t">${icon("edit")} Editor</span><span class="badge plain">EN draft</span></div>
            <div class="field"><label>Subject / heading</label><input class="input" value="${tp.name === "Town hall announcement" ? "You're invited — Q3 town hall" : tp.name}"></div>
            <div class="field"><label>Body</label>
              <textarea class="input" style="min-height:150px">Dear {{first_name}},

${tp.kind.includes("SMS") ? "Shift reminder: {{shift_date}} {{shift_time}} at {{site}}. Reply 1 to confirm." : "You're invited to the Q3 town hall on {{date}} at {{site}}.\nAgenda and joining details follow in this message…"}

— {{company_name}} HR</textarea>
              <span class="hint">Merge fields: {{first_name}} · {{date}} · {{site}} · {{position}} · {{employee_id}} — validated against the people-ledger schema.</span>
            </div>
            <div style="display:flex;gap:9px;justify-content:flex-end;flex-wrap:wrap">
              <button class="btn ghost" data-act="comms-preview-template:${tp.id}">${icon("eye")} Preview</button>
              <button class="btn ghost soon" title="Build-phase feature — not wired in this UI preview" data-act="toast:ລາວ variant opens side-by-side in the build phase">${icon("globe")} ລາວ variant</button>
              ${isPub ? `<button class="btn soft" data-act="comms-clone-template:${tp.id}">${icon("files")} Clone as custom</button>` : `<button class="btn" data-act="comms-publish-template:${tp.id}">${icon("check")} Publish v${tp.v}</button>`}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Lifecycle", steps([{ t: "Draft", s: "author" }, { t: "Review", s: "wording · fields" }, { t: "Publish", s: "locked & dated" }], isPub ? 3 : tp.status === "review" ? 1 : 0), { icon: "layers" })}
            ${card("Versions", rowlist([
          rowitem({ icon: "check", title: "v" + tp.v + " — current", sub: "updated " + tp.updated, side: badge(tp.status) }),
          rowitem({ icon: "history", title: "v" + (parseFloat(tp.v) - 0.1).toFixed(1), sub: "superseded", side: `<span class="badge plain">archived</span>`, neutral: 1 })
        ]), { icon: "history" })}
            ${card("Open as custom", `<p class="small muted">Locked at the master — any tenant can clone &amp; tailor. Publishing is versioned and audit-logged, so legal wording holds across every send.</p>`, { icon: "lock" })}
          </div>
        </div>`
      };
    },

    channels() {
      return {
        title: "Channels & gateways", sub: "Email, SMS, push and webhooks — sender identities, keys and fallbacks live here.",
        actions: `<button class="btn" data-act="comms-add-channel">${icon("plus")} Add channel</button>`,
        body: `
        ${card("Gateways", table(
          [{ h: "Channel" }, { h: "Endpoint / ID" }, { h: "Today", r: 1 }, { h: "Delivery", r: 1 }, { h: "Status" }, { h: "", r: 1 }],
          DATA.channels.map(c => ({
            cells: [`<span class="strong">${c.name}</span>`, `<span class="mono small">${c.id}</span>`, `<span class="num">${c.today}</span>`, `<span class="num">${c.rate}</span>`, badge(c.status),
            `<button class="btn xs ghost" data-act="comms-test:${c.id}">Test</button>`]
          }))), { icon: "plug" })}
        <div class="grid cols-2">
          ${card("Tier gating", rowlist([
          rowitem({ icon: "check", title: "Email + in-app / push", sub: "Core — every tier", side: badge("active") }),
          rowitem({ icon: "check", title: "SMS + segmentation", sub: "Professional ≤ 250", side: badge("active") }),
          rowitem({ icon: "lock", title: "Webhooks — LINE / WhatsApp / Teams", sub: "Enterprise ≤ 600", side: `<span class="badge plain">upgrade</span>`, neutral: 1 })
        ]), { icon: "layers" })}
          ${card("Fallback policy", `<p class="small muted" style="margin-bottom:10px">Push first → SMS if unread after 4h — defined once, used by HR sends and automated notifications alike.</p><button class="btn sm ghost soon" title="Build-phase feature — not wired in this UI preview" data-act="toast:Fallback editor is a build-phase feature">${icon("settings")} Edit policy</button>`, { icon: "refresh" })}
        </div>`
      };
    },

    roles() {
      const cap = (txt, tone) => `<span class="badge ${tone || ""} plain">${txt}</span>`;
      return {
        title: "Roles & permissions", sub: "The five-persona separation itself — every cell registers its capability row (socket: rbac); the kernel enforces scope.",
        actions: `<button class="btn soft" data-act="wf-role-approve">${icon("check")} 1 request</button>`,
        body: `
        ${card("Capability matrix — module × persona", `<div class="tablewrap"><table class="tbl">
          <thead><tr><th>Module</th><th>Staff</th><th>Manager</th><th>HR</th><th>CEO</th><th>Sys Admin</th></tr></thead>
          <tbody>
            ${[
          ["People & Org", "✎ own profile", "◴ view team", "⚙ manage all", "∑ headcount", "⚒ roles & fields"],
          ["Time & Attendance", "✎ punch / correct", "✓ L1 + team", "⚙ adjust ledger", "∑ utilization", "⚒ device hooks"],
          ["Leave & Absence", "✎ request", "✓ L1 + calendar", "⚙ accrual + L2", "∑ absence cost", "— none"],
          ["Payroll + Payslips", "◴ own payslip", "— none", "⚙ run + approve", "∑ burn", "⚒ bank / SMTP"],
          ["Requests & Approvals", "✎ submit", "✓ L1", "⚙ L2 + chains", "∑ SLA", "⚒ permissions"],
          ["Reports & Insight", "◴ own", "◴ team", "⚙ all", "∑ board KPIs", "— none"],
          ["Communication", "◴ receive", "✎ team multicast", "⚙ compose & send", "∑ reach", "⚒ channels"],
          ["Docs Vault", "✎ own + policies", "◴ team docs", "⚙ all + versions", "∑ ack %", "⚒ retention"],
          ["CMS / Templates", "— none", "— none", "◴ compose from", "— none", "⚒ author & publish"],
          ["Platform & Security", "— none", "— none", "— none", "— none", "⚒ owns"]
        ].map(r => `<tr><td class="strong">${r[0]}</td>${r.slice(1).map((c, i) => `<td><span class="small" style="color:${c.startsWith("—") ? "var(--muted-2)" : ["var(--staff-d)", "var(--mgr-d)", "var(--hr-d)", "var(--ceo-d)", "var(--sys-d)"][i]}">${c}</span></td>`).join("")}</tr>`).join("")}
          </tbody></table></div>
          <div class="legend" style="margin-top:12px"><span>✎ create/edit own</span><span>✓ approve</span><span>⚙ configure (full)</span><span>◴ view (scoped)</span><span>∑ aggregate read-only</span><span>⚒ administer platform</span></div>`,
          { icon: "key" })}
        ${card("Proof of separation", `<p class="small muted">The CEO column is uniformly ∑ aggregate; the System Admin column is uniformly ⚒ platform. Neither can touch the people-ledger — a content edit or permission change can never silently alter a pay or leave record.</p>`, { icon: "shield" })}`
      };
    },

    integrations() {
      return {
        title: "Integrations & SSO", sub: "Identity, exports and capture devices — every external surface, declared and monitored.",
        actions: `<button class="btn soon" title="Build-phase feature — not wired in this UI preview" data-act="toast:Integration catalog is a build-phase feature — certified plug-ins register via module manifest (§06)">${icon("plus")} Add integration</button>`,
        body: `
        ${card("Connected", rowlist([
          rowitem({ icon: "key", title: "Single sign-on — OIDC", sub: "id.phoungern.la · 99.4% success", side: badge("live") }),
          rowitem({ icon: "banknote", title: "Bank file export — BCEL", sub: "payroll disburse · SFTP drop", side: badge("live") }),
          rowitem({ icon: "grid", title: "Attendance devices ×2", sub: "face + finger · Plant 1 gates", side: badge("live") }),
          rowitem({ icon: "globe", title: "Public API — /api/v1", sub: "3 tokens active · rate-limited", side: badge("live") })
        ]), { icon: "plug" })}
        <div class="grid cols-2">
          ${card("Extension slots — declared seats (§06)", rowlist([
          rowitem({ icon: "receipt", title: "E1 · Expenses & Advances", sub: "in: employee.hired → out: expense.posted · db_expense", side: `<span class="badge warn plain">planned</span>` }),
          rowitem({ icon: "box", title: "E2 · Assets & Inventory", sub: "onboard kit · custody · returns", side: `<span class="badge warn plain">planned</span>` }),
          rowitem({ icon: "heart", title: "E3 · Insurance & Benefits", sub: "enrollment · premium → payroll", side: `<span class="badge warn plain">planned</span>` }),
          rowitem({ icon: "sparkle", title: "E4–E7 · ATS · Training · Performance · Loans", sub: "candidates — same six-socket contract", side: `<span class="badge plain">candidate</span>`, neutral: 1 })
        ]), { icon: "layers" })}
          ${card("Module registry", `<p class="small muted" style="margin-bottom:10px">In-house cells and certified plug-ins arrive the same way: declare manifest → contract + security review → register → enable per tenant → monitor. Disable the flag and UI, reports and permissions disappear cleanly (R6).</p>
          <div class="mono small" style="background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:12px;line-height:1.7">id: expenses · v1.0.0<br>owns_store: db_expense<br>api: /api/v1/expenses<br>ui: cards ×3 · nav "Expenses"<br>tier: professional+</div>`, { icon: "file" })}
        </div>`
      };
    },

    /* ---------- v2.3.2.db — Database Studio (whole-platform DB management) ---------- */
    database() {
      const totalRows = DB.CATALOG.reduce((n, c) => n + (DB.provisioned(c.id) ? DB.rows(c.id) : 0), 0);
      const totalKB = DB.CATALOG.reduce((n, c) => n + (DB.provisioned(c.id) ? DB.sizeKB(c.id) : 0), 0);
      const live = DB.CATALOG.filter(c => DB.provisioned(c.id)).length;
      return {
        title: "Database studio", sub: "The §05 split, made physical — one small database per tenant × store, one writer each. Click a store to browse and edit its sample rows.",
        actions: `<button class="btn soft" data-go="sysadmin/web/backups">${icon("download")} Backup center</button>
                  <button class="btn ghost" data-act="db-reset:all">${icon("refresh")} Reseed all stores</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Stores live", `${live} / ${DB.CATALOG.length}`, DATA.tier() === "essential" ? "Essential ships 8 + platform" : "Growth+ provisions db_docs", { hero: 1 })}
          ${kpi("Rows", String(totalRows), "across all live stores")}
          ${kpi("Footprint", totalKB + " KB", "megabytes, not gigabytes")}
          ${kpi("Snapshots", String(DB.backups.all().length), "in custodial storage (L-CU)")}
        </div>
        ${card("Stores — one database per tenant × store", DBV.storeGrid("sysadmin/web/dbstore"), { icon: "layers" })}
        <div class="grid cols-2">
          ${card("Demo reset — sectional, per store", DBV.resetPanel(), { icon: "refresh", badge: `<span class="badge warn plain">demo</span>` })}
          ${card("Provisioning grid — tenant × store (§02)", DBV.provisionGrid(), { icon: "grid" })}
          ${card("Placement registry — db_platform resolves every store", table(
            [{ h: "Store" }, { h: "Physical DB" }, { h: "Region" }, { h: "Encryption" }, { h: "PITR", r: 1 }],
            DB.list("db_platform", "registry").slice(0, 10).map(r => ({
              cells: [`<span class="mono small strong">${r.store}</span>`, `<span class="mono small">${r.physical}</span>`, `<span class="small muted">${r.region}</span>`, `<span class="small">${r.encryption}</span>`, `<span class="num">${r.pitr}</span>`]
            }))) + `<p class="small muted" style="margin-top:10px">Cells never hard-code locations — the kernel resolves (tenant, store) → URL + credential here. Moving a store = a registry edit, not an application change (P6).</p>`, { icon: "pin" })}
        </div>`
      };
    },

    dbstore(id) {
      const sid = DB.CATALOG.find(c => c.id === id) ? id : "db_people";
      const d = DBV.storeDetail(sid);
      return {
        title: d.m.name + " — " + d.m.physical, sub: `${d.m.layer} · ${d.m.profile} · one writer: ${d.m.writer}. ${d.m.protection}`,
        crumbs: [{ label: "Database studio", go: "sysadmin/web/database" }, { label: sid }],
        actions: `${idtag(d.m.physical)} ${d.m.provisioned ? badge(d.m.derived ? "readonly" : "active") : UI.lockTag(DATA.unlockLabel(d.m.gate))}`,
        body: `
        <div class="grid cols-4">
          ${kpi("Rows", String(d.m.rows), d.m.tables.length + " table" + (d.m.tables.length > 1 ? "s" : ""), { hero: 1 })}
          ${kpi("Size", d.m.sizeKB + " KB", "persisted unit")}
          ${kpi("Backup", d.p && d.p.enabled ? d.p.freq : "off", d.p ? d.p.custody.split(" ·")[0] : "—")}
          ${kpi("Restore priority", "P" + d.m.priority, d.m.priority === 1 ? "restored first in a drill" : "standard ladder")}
        </div>
        <div class="grid cols-3">
          <div class="span-2" style="display:flex;flex-direction:column;gap:16px">${d.tables}</div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Module actions — blast radius: this store only", `<div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn soft" data-act="backup-store:${sid}">${icon("download")} Snapshot this store now</button>
              <button class="btn ghost" data-act="store-restore:${sid}">${icon("refresh")} Restore latest snapshot${d.lastBk ? " · " + d.lastBk.id : ""}</button>
              <button class="btn ghost" data-act="db-reset:${sid}">${icon("history")} Reseed sample data</button>
            </div><p class="small muted" style="margin-top:10px">Per-module backup &amp; restore — payroll can be snapshotted before a pay run without touching time punches. Restoring this store never rewinds another.</p>`, { icon: "shield" })}
            ${card("Registry row (db_platform)", d.regCard, { icon: "pin" })}
          </div>
        </div>`
      };
    },

    /* ---------- v2.3.2.db — platform reports (runs + file storage) ---------- */
    reports() {
      return {
        title: "Platform reports", sub: "Ledger extracts and resilience posture — each section keeps its last 3 runs; click a run to view (read-only) or download. Older runs move to file storage.",
        actions: `<button class="btn ghost" data-go="sysadmin/web/report-files">${icon("folder")} File storage</button>`,
        body: REP.library("sysadmin", "sysadmin/web")
      };
    },
    "report-run"(param) {
      const p = REP.runPage(param, "sysadmin", "sysadmin/web");
      return {
        title: p.title, sub: p.sub,
        crumbs: [{ label: "Platform reports", go: "sysadmin/web/reports" }, { label: p.run ? p.run.id : "run" }],
        actions: p.run ? `${idtag(p.run.id)} ${p.run.archived ? `<span class="badge plain">archived</span>` : `<span class="badge ok plain">recent</span>`}` : "",
        body: p.body
      };
    },
    "report-files"() {
      const f = REP.filesPage("sysadmin", "sysadmin/web");
      return {
        title: "Report file storage", sub: "Runs older than the last 3 are hidden here — one folder per report, view-only with download links.",
        crumbs: [{ label: "Platform reports", go: "sysadmin/web/reports" }, { label: "File storage" }],
        body: f.kpis + f.folders
      };
    },

    /* ---------- v2.3.2.db — Backup center ---------- */
    backups() {
      const bc = DBV.backupCenter();
      return {
        title: "Backups & restore", sub: "Three layers deep, granular to one file — backup now, on schedule, selectable per store, customizable per module (Blueprint v2.3.2 §06).",
        actions: `<button class="btn ghost" data-act="drill">${icon("shield")} Run restore drill</button>`,
        body: `
        <div class="grid cols-3">
          <div class="span-2" style="display:flex;flex-direction:column;gap:16px">
            ${card("Back up now — selectable per store", bc.select, { icon: "download" })}
            ${card("Schedules — per module, cross-customizable", bc.schedule, { icon: "calendar" })}
            ${card("Snapshot history — custodial layer (L-CU)", bc.history, { icon: "history" })}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("The backup ladder", DBV.ladder(), { icon: "layers" })}
            ${card("Restore drills — monthly, automated, boring", bc.drillCard, { icon: "shield" })}
          </div>
        </div>`
      };
    },

    audit() {
      return {
        title: "Audit log", sub: "Append-only — every change, who and when. The event bus persists here (db_audit).",
        actions: `<button class="btn ghost" data-act="audit-dl">${icon("download")} ${t("common.export")}</button>`,
        body: `
        <div class="grid cols-3">
          ${kpi("Events today", "1,204", "live tail below", { hero: 1 })}
          ${kpi("Anomalies", "0", "rule engine")}
          ${kpi("Retention", "7 years", "tenant policy · in-country")}
        </div>
        ${card("Live tail", table(
          [{ h: "Time" }, { h: "Actor" }, { h: "Action" }, { h: "Object" }, { h: "Origin" }],
          DATA.audit.map(a => ({
            cells: [`<span class="mono small">${a.ts}</span>`, a.who, `<span class="mono small">${a.act}</span>`, idtag(a.obj), `<span class="small muted">${a.ip}</span>`]
          }))), { icon: "history" })}
        ${card("Why it reads like a ledger", `<p class="small muted">Writes land in exactly one store, become facts on the event bus, and persist here immutably — approve something in the Manager persona and watch it appear at the top of this tail.</p>`, { icon: "lock" })}`
      };
    }
  };

  /* ---------- MOBILE (alerts-first) ---------- */
  const mobile = {
    health() {
      return {
        title: "Platform", body: `
        ${card("", `<div style="display:flex;align-items:center;gap:10px">${icon("check", "")}<b>Platform healthy</b><span style="margin-left:auto" class="badge ok">99.98%</span></div>`)}
        <div class="grid cols-2">${kpi("Delivery", "99.1%", "blended")}${kpi("Sessions", "212", "active")}</div>
        ${card("Alerts", rowlist([
          rowitem({ icon: "x", title: "LINE webhook down", sub: "failover active", side: badge("failed") }),
          rowitem({ icon: "alert", title: "SMS cert expiring", sub: "renew by Jul 01", side: badge("expiring") })
        ]), { icon: "bell" })}`
      };
    },
    templates() {
      return {
        title: "Templates", body: card("Review queue", rowlist(DATA.templates.filter(x => x.status !== "published").map(tp => rowitem({
          icon: "file", title: tp.name, sub: tp.id + " · v" + tp.v, side: badge(tp.status), go: "sysadmin/mobile/template/" + tp.id
        }))) + `<p class="small muted" style="margin-top:10px">Authoring stays on web — mobile is for review &amp; publish on the go.</p>`, { icon: "files" })
      };
    },
    audit() {
      return {
        title: "Audit", body: card("Today · 1,204", rowlist(DATA.audit.slice(0, 6).map(a => rowitem({
          icon: "history", neutral: 1, title: a.act, sub: a.who + " · " + a.ts, side: ""
        }))), { icon: "lock" })
      };
    },
    template(id) {
      const tp = DATA.templates.find(x => x.id === id) || DATA.templates[0];
      return {
        title: tp.id, back: "sysadmin/mobile/templates", body: `
        ${card("", `<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">${idtag(tp.id)}${badge(tp.status)}</div>
        <h3 style="font-size:16px;margin:10px 0 2px">${tp.name}</h3><div class="small muted">${tp.kind} · ${tp.lang} · v${tp.v}</div>`)}
        ${tp.status !== "published" ? `<button class="btn" style="width:100%" data-act="comms-publish-template:${tp.id}">${icon("check")} Approve & publish</button>` : ""}`
      };
    }
  };

  PERSONAS.sysadmin = {
    key: "sysadmin", label: t("personas.sysadmin"), icon: "settings",
    appName: "Adeptio Console", roleLine: "Platform · content · security",
    domain: "admin.adeptio.hr/platform",
    nav: [
      { group: "Platform", items: [
        { id: "health", icon: "pulse", label: t("sys.health") },
        { id: "templates", icon: "files", label: t("sys.templates"), count: () => DATA.templates.filter(x => x.status !== "published").length },
        { id: "channels", icon: "plug", label: t("sys.channels") }
      ]},
      { group: "Data layer", items: [
        { id: "database", icon: "grid", label: "Database studio" },
        { id: "backups", icon: "download", label: "Backups & restore", count: () => DB.backups.all().length },
        { id: "reports", icon: "chart", label: "Platform reports" }
      ]},
      { group: "Security", items: [
        { id: "roles", icon: "key", label: t("sys.roles") },
        { id: "integrations", icon: "layers", label: t("sys.integrations") },
        { id: "audit", icon: "lock", label: t("sys.audit") }
      ]}
    ],
    parent: { template: "templates", dbstore: "database", "report-run": "reports", "report-files": "reports" },
    tabs: [
      { id: "health", icon: "pulse", label: "Health" },
      { id: "templates", icon: "files", label: "Templates" },
      { id: "audit", icon: "lock", label: "Audit" }
    ],
    tabParent: { template: "templates" },
    web, mobile
  };
})();
