/* ============================================================
   ADEPTIO · HR persona (People Ops) — blue
   Web (full console): Pulse · Approvals L2 · Communication ·
     People(→person) · Time · Leave · Payroll(→run) · Documents · Reports
   Mobile (deliberately light): Queue · Alerts · Me
   ============================================================ */
(function () {
  const { icon, kpi, card, badge, idtag, rowitem, rowlist, table, steps, empty, avatar, sparkline, bars, lines2, donut, kip } = UI;

  // v2.3.2.db — the master record lives in db_people.employees now (one writer: People cell)
  const allStaff = () => DATA.employees;

  function l2queue(device, compact) {
    const q = DATA.pendingL2();
    if (!q.length) return empty("check", "L2 queue clear", "Nothing waiting on HR / Finance.");
    return q.map(r => `
      <div class="qrow">
        <div class="qmain" data-go="hr/${device === "mobile" ? "mobile/approval" : "web/approval"}/${r.id}" role="button" tabindex="0">
          <div class="qt">${idtag(r.id)} ${UI.esc(r.who)} · ${UI.esc(r.detail)} <span class="sla">${r.sla}</span></div>
          <div class="qs">L1 ✓ Khamla S. · ${r.dates}</div>
        </div>
        <div class="qact">
          <button class="btn ok sm" data-act="approve:${r.id}">${icon("check")}${compact ? "" : " Settle"}</button>
          <button class="btn danger sm" data-act="return:${r.id}">${icon("x")}${compact ? "" : " Return"}</button>
        </div>
      </div>`).join("");
  }

  /* ---------- WEB ---------- */
  const web = {
    pulse() {
      return {
        title: "HR pulse", sub: "The org today — every count is one click from its queue.",
        actions: `<button class="btn soft" data-go="hr/web/comms">${icon("megaphone")} Announce</button>
                  <button class="btn" data-go="hr/web/payroll/PR-2026-06">${icon("banknote")} Run payroll</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Headcount", String(DATA.org().headcount), `<span class="up">${DATA.org().newMoM}</span> this month`, { hero: 1 })}
          ${kpi("Present today", DATA.org().presentPct, `${DATA.org().present} of ${DATA.org().headcount} · ${DATA.org().late} late`)}
          ${DATA.has("l2") ? kpi("Approvals L2", String(DATA.pendingL2().length + 22), "oldest 1.8 d") : kpi("Approvals · L1", "9", "single-step · at managers")}
          ${kpi("Payroll cut-off", "15 d", "Jun 25 · run in draft")}
        </div>
        <div class="grid cols-3" style="margin-top:16px">
          <div class="span-2" style="display:flex;flex-direction:column;gap:16px">
            ${card("Needs attention", rowlist([
          DATA.has("l2") ? rowitem({ icon: "inbox", title: "L2 approvals waiting", sub: "1 claim settle + 22 cross-module", side: `<b class="num">23</b>`, go: "hr/web/approvals" }) : `<div class="rowitem row-locked"><span class="ric n">${icon("lock")}</span><div class="rmain"><div class="rt">Multi-step approvals (L1 → L2)</div><div class="rs">Single-step on Essential — managers complete at L1</div></div><div class="rside">${UI.lockTag(DATA.unlockLabel("l2"))}</div></div>`,
          rowitem({ icon: "banknote", title: "Payroll run PR-2026-06 in draft", sub: "3 OT batches pending L1 upstream", side: badge("draft"), go: "hr/web/payroll/PR-2026-06" }),
          DATA.has("vault") ? rowitem({ icon: "alert", title: "Contracts expiring ≤ 30 days", sub: "3 staff · renewal letters from template", side: `<b class="num">3</b>`, go: "hr/web/docs" }) : `<div class="rowitem row-locked"><span class="ric n">${icon("lock")}</span><div class="rmain"><div class="rt">Contract & document expiry alerts</div><div class="rs">Documents Vault</div></div><div class="rside">${UI.lockTag(DATA.unlockLabel("vault"))}</div></div>`,
          DATA.has("sysadmin") ? rowitem({ icon: "x", title: "Failed sends — LINE webhook", sub: "Channel down since 09:31 · SysAdmin notified", side: badge("failed"), go: "hr/web/comms" }) : rowitem({ icon: "check", title: "Channels healthy", sub: "in-app + transactional email · 99.4% today", side: badge("ok"), go: "hr/web/comms" })
        ]), { icon: "bell" })}
            ${card("Attendance board — today", `
              <div class="grid cols-4" style="gap:10px;margin-bottom:14px">
                ${[`Present|${DATA.org().present}|ok`, `Late|${DATA.org().late}|warn`, `Absent|${DATA.org().absent}|bad`, `On leave|${DATA.org().onleave}|`].map(s => { const [l, v, tn] = s.split("|"); return `<div style="text-align:center;padding:10px 6px;border:1px solid var(--line);border-radius:12px"><div class="num" style="font-size:22px;font-weight:650">${v}</div><span class="badge ${tn}">${l}</span></div>`; }).join("")}
              </div>
              ${sparkline(DATA.attendanceTrend)}<div class="small muted" style="margin-top:6px">Org present % · trailing 10 working days</div>`, { icon: "pulse", link: "hr/web/time" })}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Payroll run", steps([{ t: "Draft", s: "pull ledgers" }, { t: "Validate", s: "PIT · SSO" }, { t: "Approve", s: "L2" }, { t: "Disburse", s: "bank file" }], DATA.payrollRuns[0].step - 1) + `<button class="btn sm soft" style="margin-top:10px" data-go="hr/web/payroll/PR-2026-06">Open run ${icon("chevR")}</button>`, { icon: "banknote" })}
            ${card("KPIs", rowlist([
          rowitem({ icon: "trend", title: "Attrition (12-mo)", sub: "vs 8.4% last year", side: `<b class="num">7.2%</b>` }),
          rowitem({ icon: "clock", title: "Time-to-approve", sub: "median, all flows", side: `<b class="num">6.1 h</b>` }),
          rowitem({ icon: "check", title: "Payroll accuracy", sub: "May run", side: `<b class="num">99.97%</b>` })
        ]), { icon: "chart" })}
            ${card(t("common.quickActions"), `<div class="choice-row">
              <button class="choice" data-go="hr/web/people">${icon("plus")} New hire</button>
              <button class="choice" data-go="hr/web/comms">${icon("megaphone")} Announce</button>
              ${DATA.has("vault") ? `<button class="choice" data-go="hr/web/docs">${icon("file")} Generate doc</button>` : UI.lockChoice("Generate doc", DATA.unlockLabel("vault"))}
              ${DATA.has("l2") ? `<button class="choice" data-go="hr/web/approvals">${icon("inbox")} Approvals</button>` : UI.lockChoice("L2 approvals", DATA.unlockLabel("l2"))}
            </div>`, { icon: "sparkle" })}
          </div>
        </div>`
      };
    },

    approvals() {
      return {
        title: "Approvals — L2 · cross-module", sub: "Final checkpoint before the ledger: claims settle, corrections post, chains close.",
        body: `
        <div class="grid cols-4">
          ${kpi("Waiting on HR", String(DATA.pendingL2().length + 22), "all modules", { hero: 1 })}
          ${kpi("Claims to settle", String(DATA.pendingL2().length), "via payroll or finance")}
          ${kpi("Median age", "0.9 d", "SLA 2 d")}
          ${kpi("Escalations", "0", "this week")}
        </div>
        ${card("Settle now", l2queue("web"), { icon: "inbox" })}
        ${card("Cross-module queue (sample)", table(
          [{ h: "ID" }, { h: "Type" }, { h: "Who" }, { h: "Stage" }, { h: "Age", r: 1 }, { h: "", r: 1 }],
          [
            { cells: [idtag("TC-0109"), "Correction", "Latsamy V.", "Adjust ledger", `<span class="num">0.4 d</span>`, `<button class="btn xs soft" data-act="toast:Ledger adjusted — audit-logged">Post</button>`] },
            { cells: [idtag("PRF-0042"), "Profile change", "Davone P.", "Bank account update", `<span class="num">0.7 d</span>`, `<button class="btn xs soft" data-act="toast:Profile change approved">Approve</button>`] },
            { cells: [idtag("DOC-0290"), "Document", "Manysone V.", "Salary certificate", `<span class="num">0.2 d</span>`, `<button class="btn xs soft" data-act="toast:Generated — serial DOC-0290, e-signed">Generate</button>`] }
          ]), { icon: "layers" })}`
      };
    },

    approval(id) {
      const r = DATA.requests.find(x => x.id === id) || DATA.requests[0];
      return {
        title: `Settle — ${r.detail}`, sub: "L1 approved upstream; HR / Finance closes the chain and the ledger syncs.",
        crumbs: [{ label: "Approvals", go: "hr/web/approvals" }, { label: r.id }],
        actions: `${idtag(r.id)} ${badge(r.status)}`,
        body: `
        <div class="grid cols-3">
          <div class="span-2">${card("Chain", steps([
          { t: "Staff", s: r.who.split(" ")[0] }, { t: "Manager · L1", s: "Approved ✓" },
          { t: "HR / Finance · L2", s: "You are here" }, { t: "Ledger", s: "Payroll sync" }
        ], 2), { icon: "layers" })}
          ${card("Item", table([{ h: "Field" }, { h: "Value" }], [
          { cells: ["Who", r.who] }, { cells: ["What", r.detail] },
          { cells: ["Evidence", "Receipt photo · verified"] }, { cells: ["Cost center", "PRD-A-110"] },
          { cells: ["Reimburse via", "June payroll run (PR-2026-06)"] }
        ]), { icon: "file" })}</div>
          <div>${r.status === "pending" ? card("Decide", `<div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn ok" data-act="approve:${r.id}">${icon("check")} Settle via payroll</button>
            <button class="btn ghost" data-act="toast:Routed to finance export instead">${icon("send")} Settle via finance</button>
            <button class="btn danger" data-act="return:${r.id}">${icon("x")} Return</button>
          </div>`, { icon: "settings" }) : card("Done", `<p class="small muted">Settled — lands on pay run PR-2026-06 as a reimbursement line.</p>`, { icon: "check" })}</div>
        </div>`
      };
    },

    comms() {
      const sent = DATA.state.sent;
      return {
        title: "Communication", sub: "One composer — pick who, pick how; System-Admin templates keep every send on-brand.",
        body: `
        <div class="grid cols-3">
          <div class="card span-2">
            <div class="card-head"><span class="t">${icon("send")} Compose</span><span class="badge acc">from template</span></div>
            <div class="field"><label>To — audience</label>
              <div class="choice-row" id="aud-row">
                <button class="choice" ${DATA.has("segmentation") ? "" : 'aria-pressed="true"'} data-act="pick:aud">Broadcast — all ${DATA.org().broadcast}</button>
                ${DATA.has("segmentation")
                  ? `<button class="choice" aria-pressed="true" data-act="pick:aud">Division · Production</button><button class="choice" data-act="pick:aud">Level · Supervisors</button><button class="choice" data-act="pick:aud">Site · Plant 1</button>`
                  : UI.lockChoice("Division", DATA.unlockLabel("segmentation")) + UI.lockChoice("Level", DATA.unlockLabel("segmentation")) + UI.lockChoice("Site", DATA.unlockLabel("segmentation"))}
                <button class="choice" data-act="pick:aud">Individual</button>
              </div>
            </div>
            <div class="field"><label>Channels — one or many, with fallback</label>
              <div class="choice-row" id="ch-row">
                ${DATA.has("broadcastEmail") ? `<button class="choice" aria-pressed="true" data-act="pick:ch">${icon("mail")} Email</button>` : UI.lockChoice("Email broadcast", DATA.unlockLabel("broadcastEmail"))}
                <button class="choice" aria-pressed="true" data-act="pick:ch">${icon("phone")} Push / in-app</button>
                ${DATA.has("sms") ? `<button class="choice" data-act="pick:ch">${icon("send")} SMS</button>` : UI.lockChoice("SMS", DATA.unlockLabel("sms"))}
              </div>
            </div>
            <div class="field"><label>Template</label>
              <select class="input"><option>Town hall announcement — EN · ລາວ (TPL-019)</option><option>Document expiry notice (TPL-026)</option><option>Shift reminder — SMS (TPL-023)</option></select>
              <span class="hint">Dear {{first_name}}, you're invited to the Q3 town hall on {{date}} at {{site}}…</span>
            </div>
            <div class="grid cols-2">
              <div class="field"><label>Schedule</label><div class="choice-row">
                <button class="choice" aria-pressed="true" data-act="pick:sch">Send now</button>${DATA.has("scheduledReports") ? `<button class="choice" data-act="pick:sch">Schedule</button><button class="choice" data-act="pick:sch">Recurring</button>` : UI.lockChoice("Schedule", DATA.unlockLabel("scheduledReports")) + UI.lockChoice("Recurring", DATA.unlockLabel("scheduledReports"))}</div></div>
              <div class="field"><label>Fallback</label>${DATA.has("sms") ? `<select class="input"><option>Push first → SMS if unread in 4h</option><option>None</option></select>` : `<div>${UI.lockTag(DATA.unlockLabel("sms"))} <span class="small muted">multi-channel fallback</span></div>`}</div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
              <span class="small muted">≈ <b class="num" style="color:var(--ink)">${DATA.has("segmentation") ? DATA.org().segment + " recipients" : DATA.org().broadcast + " recipients"}</b> · ${DATA.has("segmentation") ? "Production" : "broadcast"} · ${DATA.has("broadcastEmail") ? "2 channels" : "1 channel"}</span>
              <button class="btn" data-act="send-comms">${icon("send")} Send</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Delivery — last 7 days", rowlist([
          rowitem({ icon: "mail", title: "Email", sub: "412 sent today", side: `<b class="num">99.2%</b>` }),
          rowitem({ icon: "phone", title: "Push / in-app", sub: "1,240 sent today", side: `<b class="num">99.9%</b>` }),
          DATA.has("sms") ? rowitem({ icon: "send", title: "SMS", sub: "86 sent today", side: `<b class="num">97.8%</b>` }) : `<div class="rowitem row-locked"><span class="ric n">${icon("lock")}</span><div class="rmain"><div class="rt">SMS</div><div class="rs">urgent · OTP · shift reminders</div></div><div class="rside">${UI.lockTag(DATA.unlockLabel("sms"))}</div></div>`,
          DATA.has("webhook") ? rowitem({ icon: "x", title: "LINE webhook", sub: "down since 09:31", side: badge("failed") }) : `<div class="rowitem row-locked"><span class="ric n">${icon("lock")}</span><div class="rmain"><div class="rt">LINE / WhatsApp webhooks</div><div class="rs">advanced channels</div></div><div class="rside">${UI.lockTag(DATA.unlockLabel("webhook"))}</div></div>`
        ]), { icon: "pulse" })}
            ${card("Sent log", sent.length ? rowlist(sent.map(s => rowitem({ icon: "check", title: `${s.id} · ${s.audience}`, sub: `${s.ch} · ${s.ts}`, side: `<b class="num">${s.est}</b>` }))) : rowlist([
          rowitem({ icon: "check", title: "MSG-0087 · Safety drill notice", sub: "Email · Push · Jun 08", side: `<b class="num">248</b>` }),
          rowitem({ icon: "check", title: "MSG-0086 · Payslip ready (auto)", sub: "Push · Jun 01", side: `<b class="num">246</b>` })
        ]), { icon: "history" })}
          </div>
        </div>`
      };
    },

    /* ---------- v2.3.2.db — HR data manager (HR-owned stores) ---------- */
    data(param) {
      const mineStores = ["db_people", "db_leave", "db_workflow", "db_payroll", "db_comms"];
      const sid = mineStores.includes(param) ? param : "db_people";
      const m = DB.meta(sid);
      const chips = mineStores.map(s => `<button class="choice" ${s === sid ? 'aria-pressed="true"' : ""} data-go="hr/web/data/${s}">${icon(DB.meta(s).icon)} ${s}</button>`).join("");
      const lastBk = DB.backups.all().find(b => b.stores.includes(sid));
      return {
        title: "Data manager", sub: "The stores the HR persona writes — browse, add and delete sample rows; snapshot any module before you touch it.",
        actions: `<button class="btn soft" data-act="backup-store:${sid}">${icon("download")} Snapshot ${sid} now</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Store", m.physical, m.layer + " · " + m.profile, { hero: 1 })}
          ${kpi("Rows", String(m.rows), m.tables.length + " table" + (m.tables.length > 1 ? "s" : ""))}
          ${kpi("Size", m.sizeKB + " KB", "one small database")}
          ${kpi("Last snapshot", lastBk ? lastBk.id : "—", lastBk ? lastBk.ts : "none yet — take one")}
        </div>
        ${card("Pick a store", `<div class="choice-row">${chips}</div>`, { icon: "layers" })}
        <div class="grid cols-3">
          <div class="span-2" style="display:flex;flex-direction:column;gap:16px">
            ${m.tables.map(tn => card(sid + " · " + tn, DBV.tableEditor(sid, tn), { icon: "list" })).join("")}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Module backup — this store only", `<div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn soft" data-act="backup-store:${sid}">${icon("download")} Snapshot now</button>
              <button class="btn ghost" data-act="store-restore:${sid}">${icon("refresh")} Restore latest${lastBk ? " · " + lastBk.id : ""}</button>
              <button class="btn ghost" data-act="db-reset:${sid}">${icon("history")} Reseed sample data</button>
            </div><p class="small muted" style="margin-top:10px">${sid === "db_payroll" ? "Payroll's extra belt: the kernel also branches this store automatically before every pay run (step 3 of the run)." : "Backup / restore per module — restoring " + sid + " never rewinds another store."}</p>`, { icon: "shield" })}
            ${card("Why HR sees a scoped studio", `<p class="small muted">Full cross-store management (registry, provisioning, drills) lives with the System Admin. HR manages the content of the stores its cells own — the capability matrix (⚙) made literal.${DATA.tier() === "essential" ? " On Essential, HR doubles for the locked Admin persona — this section is the whole DB console you need at ≤50 seats." : ""}</p>`, { icon: "key" })}
          </div>
        </div>`
      };
    },

    /* ---------- v2.3.2.db — new hire (writes db_people through the People cell) ---------- */
    "person-new"() {
      const divs = ["Production", "Sales", "Logistics", "Finance", "Admin"];
      const teams = ["—", "Line A", "Line B"];
      return {
        title: "New hire", sub: "Creates the master record in db_people (EMP-#### · flow F) — every other module starts reading it instantly.",
        crumbs: [{ label: "People & Org", go: "hr/web/people" }, { label: "New hire" }],
        body: `
        <div class="grid cols-3">
          <div class="card span-2">
            <div class="grid cols-2">
              <div class="field"><label>Full name</label><input class="input" id="st-name" placeholder="e.g. Khamphone Soudavanh"></div>
              <div class="field"><label>Position</label><input class="input" id="st-pos" placeholder="e.g. Machine Operator"></div>
            </div>
            <div class="grid cols-2">
              <div class="field"><label>Division</label><select class="input" id="st-div">${divs.map(d => `<option>${d}</option>`).join("")}</select></div>
              <div class="field"><label>Team assignment</label><select class="input" id="st-team">${teams.map(x => `<option>${x}</option>`).join("")}</select><span class="hint">Assign “Line A” and the new hire appears on the Manager's roster, attendance board and schedule immediately.</span></div>
            </div>
            <div style="display:flex;gap:9px;justify-content:flex-end">
              <button class="btn ghost" data-go="hr/web/people">${t("common.cancel")}</button>
              <button class="btn" data-act="staff-add">${icon("plus")} Create employee record</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("What happens on create", rowlist([
              rowitem({ icon: "users", title: "Row lands in db_people", sub: "EMP-#### auto-issued · status: probation", side: "" }),
              rowitem({ icon: "lock", title: "employee.hired fact", sub: "appended to db_audit", side: "" }),
              rowitem({ icon: "chart", title: "Org KPIs move", sub: "headcount & division counts re-derive", side: "" })
            ]), { icon: "layers" })}
            ${card("One writer", `<p class="small muted">Only the People cell writes db_people — managers see the new row through their lens, never a copy. Offboarding later is the mirror image: export + delete, audit-logged.</p>`, { icon: "shield" })}
          </div>
        </div>`
      };
    },

    people() {
      return {
        title: "People & Org", sub: "Master record and the org backbone — every other module reads from here. Live from db_people: hire, reassign and offboard.",
        actions: `<button class="btn soft" data-act="toast:Org chart export queued">${icon("download")} Org chart</button><button class="btn" data-go="hr/web/person-new">${icon("plus")} New hire</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Active staff", String(DATA.employees.length), DATA.org().newMoM + " MoM · db_people live", { hero: 1 })}
          ${kpi("Divisions", "5", "Production · Sales · Logistics · Finance · Admin")}
          ${kpi("On probation", String(DATA.employees.filter(p => p.status === "probation").length), "review at 90 days")}
          ${kpi("Open lifecycle", "4", "1 onboard · 2 transfer · 1 exit")}
        </div>
        ${card("Directory", `
          <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
            <input class="input" style="max-width:280px" placeholder="Search name, ID, position…">
            <div class="choice-row"><button class="choice" aria-pressed="true">All</button><button class="choice">Production</button><button class="choice">Sales</button><button class="choice">Finance</button></div>
          </div>` + table(
          [{ h: "Employee" }, { h: "Division" }, { h: "Position" }, { h: "Since" }, { h: "Status" }, { h: "", r: 1 }],
          allStaff().map(p => ({
            go: `hr/web/person/${p.id}`,
            cells: [
              `<div style="display:flex;align-items:center;gap:10px">${avatar(p.name)}<div><div class="strong">${p.name}</div><div class="small muted">${p.id}</div></div></div>`,
              p.div, p.pos, p.since,
              (p.status || "active") === "active" ? badge("active") : p.status === "probation" ? `<span class="badge warn">Probation</span>` : badge("flagged"),
              icon("chevR")
            ]
          }))), { icon: "users" })}`
      };
    },

    person(id) {
      const p = allStaff().find(x => x.id === id) || allStaff()[0];
      return {
        title: p.name, sub: `${p.pos} · ${p.div} — the master record (full HR lens).`,
        crumbs: [{ label: "People & Org", go: "hr/web/people" }, { label: p.id }],
        actions: `<button class="btn ghost" data-act="toast:Letter generated from TPL-014 — serial DOC-0294">${icon("file")} Generate letter</button><button class="btn soft" data-act="toast:Edit mode is a build-phase feature">${icon("edit")} Edit</button>`,
        body: `
        <div class="grid cols-3">
          <div class="card span-2">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">${avatar(p.name, 1)}
              <div><div style="font-weight:800;font-size:16px">${p.name}</div><div class="small muted">${p.id} · ${p.div} · since ${p.since}</div></div>
              <span style="margin-left:auto">${badge((p.status || "active") === "active" ? "active" : p.status)}</span></div>
            ${table([{ h: "Field" }, { h: "Value" }], [
          { cells: ["Position / grade", p.pos + " · G4"] },
          { cells: ["Employment", "Full-time · permanent"] },
          { cells: ["Reports to", "Khamla Sisouphanh (EMP-0098)"] },
          { cells: ["Cost center", "PRD-A-110"] },
          { cells: ["Documents", `Contract ✓ · ID ✓ · License <span class="badge warn">expiring</span>`] }
        ])}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Manage record — db_people", `
              <div class="grid cols-2">
                <div class="field"><label>Division</label><select class="input" id="as-div">${["Production", "Sales", "Logistics", "Finance", "Admin"].map(d => `<option ${p.div === d ? "selected" : ""}>${d}</option>`).join("")}</select></div>
                <div class="field"><label>Team</label><select class="input" id="as-team">${["—", "Line A", "Line B"].map(x => `<option ${p.team === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <button class="btn soft" data-act="staff-assign:${p.id}">${icon("users")} Apply reassignment</button>
                <button class="btn danger" data-act="staff-del:${p.id}">${icon("logout")} Offboard &amp; remove</button>
              </div>
              <p class="small muted" style="margin-top:10px">Reassignment moves the row (managers' lenses update instantly); offboarding is export + delete — both land on db_audit.</p>`, { icon: "settings" })}
            ${card("Lifecycle", steps([{ t: "Onboard", s: p.since }, { t: "Active", s: "current" }, { t: "Transfer", s: "—" }, { t: "Offboard", s: "—" }], 1), { icon: "layers" })}
            ${card("Ledger trail", rowlist(DATA.requests.filter(r => r.who === p.name).slice(0, 3).map(r => rowitem({ icon: "inbox", title: `${r.id} · ${r.detail}`, sub: r.stage, side: badge(r.status) })) || []), { icon: "history" })}
          </div>
        </div>`
      };
    },

    time() {
      return {
        title: "Time & Attendance", sub: "Org-wide live board from the attendance ledger — multi-source capture, one truth.",
        actions: `<button class="btn ghost" data-act="toast:Exceptions report generated">${icon("download")} Exceptions</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Present", String(DATA.org().present), `${DATA.org().presentPct} of ${DATA.org().headcount}`, { hero: 1 })}
          ${kpi("Late", String(DATA.org().late), "auto-flagged")}
          ${kpi("Absent / no-show", String(DATA.org().absent), "on PV ladder")}
          ${kpi("Missing punches", DATA.has("deviceCapture") ? "6" : "2", "corrections open")}
        </div>
        <div class="grid cols-3" style="margin-top:16px">
          <div class="span-2">${card("By division — present today", bars(DATA.org().divisions.map(d => ({ l: d.name, v: Math.max(1, Math.round(d.staff * 0.94)), vt: Math.max(1, Math.round(d.staff * 0.94)) + "", tone: undefined })), { values: 1 }), { icon: "chart" })}</div>
          ${card("Capture sources — today", rowlist([
          rowitem({ icon: "phone", title: "Mobile + GPS", sub: "geofenced punches", side: `<b class="num">${DATA.has("deviceCapture") ? "61%" : "72%"}</b>` }),
          DATA.has("deviceCapture") ? rowitem({ icon: "grid", title: "Device · face / finger", sub: "2 scanners · Plant 1", side: `<b class="num">31%</b>` }) : `<div class="rowitem row-locked"><span class="ric n">${icon("lock")}</span><div class="rmain"><div class="rt">Device · face / finger / card</div><div class="rs">scanner & kiosk capture</div></div><div class="rside">${UI.lockTag(DATA.unlockLabel("deviceCapture"))}</div></div>`,
          rowitem({ icon: "globe", title: "Web clock", sub: "office staff", side: `<b class="num">${DATA.has("deviceCapture") ? "8%" : "28%"}</b>` })
        ]), { icon: "plug" })}
        </div>
        ${card("Exceptions — today", table(
          [{ h: "Who" }, { h: "Exception" }, { h: "Source" }, { h: "Status" }, { h: "", r: 1 }],
          [
            { cells: ["Keo Sayavong", "No-show · 2nd this month", "Roster check", badge("flagged"), `<button class="btn xs soft" data-act="toast:Escalated on PV ladder — manager coached, HR recorded">Escalate</button>`] },
            { cells: ["Noy Keomany", "Late 09:12 (+42m)", "Device scan", badge("late"), `<button class="btn xs ghost" data-act="toast:Noted — monitoring">Note</button>`] },
            { cells: ["6 staff", "Missing punch", "Ledger scan", badge("pending"), `<button class="btn xs ghost" data-act="toast:Correction reminders sent (TC flow)">Remind</button>`] }
          ]), { icon: "alert" })}`
      };
    },

    leave() {
      return {
        title: "Leave & Absence", sub: "Configurable types and accrual — wired to the calendar and payroll.",
        actions: `<button class="btn soft" data-act="toast:Holiday calendar opens — localizable per country">${icon("calendar")} Holiday calendar</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("On leave today", "5", "2.0% of org", { hero: 1 })}
          ${kpi("Pending requests", "9", "across all teams")}
          ${kpi("Liability", "1,872 d", "accrued org-wide")}
          ${kpi("Carry-over expiring", "114 d", "by Dec 31")}
        </div>
        <div class="grid cols-2" style="margin-top:16px">
          ${card("Leave types & accrual", table(
          [{ h: "Type" }, { h: "Accrual" }, { h: "Carry-over" }, { h: "Approval" }],
          [
            { cells: ["Annual", "1.25 d / month", "max 5 d", "L1 → record"] },
            { cells: ["Sick", "15 d / year", "—", "L1 + certificate"] },
            { cells: ["Personal", "3 d / year", "—", "L1 → L2"] },
            { cells: ["Statutory (Lao)", "per labor law", "—", "auto"] }
          ]), { icon: "settings" })}
          ${card("July conflict heatmap — Production", UI.heatcal({ until: 0, levels: { 6: "l1", 7: "l2", 8: "l3", 9: "l2", 13: "l1", 20: "l1", 21: "l2" } }) + `<div class="legend" style="margin-top:10px"><span><i style="background:var(--acc-bg)"></i>1 away</span><span><i style="background:var(--acc-ln)"></i>2 away</span><span><i style="background:var(--acc)"></i>3+ away</span></div>`, { icon: "calendar" })}
        </div>`
      };
    },

    payroll() {
      return {
        title: "Payroll", sub: "Draft → validate → approve → disburse. Statutory PIT and social security are pluggable rule packs.",
        body: `
        <div class="grid cols-4">
          ${kpi("Current run", "PR-2026-06", "draft · cut-off Jun 25", { hero: 1 })}
          ${kpi("Gross (draft)", DATA.org().gross, DATA.org().runStaff + " staff")}
          ${kpi("May accuracy", "99.97%", "1 retro adjustment")}
          ${kpi("Bank file", "BCEL format", "export at disburse")}
        </div>
        ${card("Runs", table(
          [{ h: "Run" }, { h: "Period" }, { h: "Staff", r: 1 }, { h: "Gross", r: 1 }, { h: "Status" }, { h: "", r: 1 }],
          DATA.payrollRuns.map((r, i) => {
            const ess = DATA.tier() === "essential";
            const st = ess ? [48, 47, 47][i] || 47 : r.staff;
            const gr = ess ? ["₭ 276M", "₭ 271M", "₭ 268M"][i] || r.gross : r.gross;
            return {
              go: `hr/web/payroll-run/${r.id}`,
              cells: [idtag(r.id), r.period, `<span class="num">${st}</span>`, `<span class="num">${gr}</span>`, badge(r.state), icon("chevR")]
            };
          })), { icon: "banknote" })}
        ${card("Statutory packs — Lao PDR", rowlist([
          rowitem({ icon: "shield", title: "Personal income tax (PIT)", sub: "Progressive bands · 2026 tables", side: badge("active") }),
          rowitem({ icon: "heart", title: "Social security (SSO)", sub: "Employee 5.5% · employer 6.0%", side: badge("active") }),
          rowitem({ icon: "clock", title: "OT rules", sub: "150% weekday · 200% holiday · caps", side: badge("active") })
        ]) + `<p class="small muted" style="margin-top:10px">Swap per country — the payroll cell is sealed behind its contract (§04), so a bureau could replace it without the platform noticing.</p>`, { icon: "plug" })}`
      };
    },

    "payroll-run"(id) {
      const r = DATA.payrollRuns.find(x => x.id === id) || DATA.payrollRuns[0];
      const canAdvance = r.step < 4;
      const stepLabels = ["Draft", "Validate", "Approve", "Disburse"];
      return {
        title: "Pay run — " + r.period, sub: "Pulls time, OT, leave and claims from their cells; writes pay lines once.",
        crumbs: [{ label: "Payroll", go: "hr/web/payroll" }, { label: r.id }],
        actions: `${idtag(r.id)} ${badge(r.state)}`,
        body: `
        ${card("Progress", steps([
          { t: "Draft", s: "ledgers pulled" }, { t: "Validate", s: "codes · PIT · SSO" },
          { t: "Approve", s: "HR sign-off" }, { t: "Disburse", s: "bank file + payslips" }
        ], r.step - 1) + (canAdvance ? `<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">
          <button class="btn" data-act="advance-run:${r.id}">${icon("chevR")} ${["", "Validate run", "Approve run", "Disburse & export", ""][r.step]}</button>
          <button class="btn ghost" data-act="toast:Variance report generated — 3 items over threshold">${icon("eye")} Variance check</button>
        </div>` : `<p class="small muted" style="margin-top:12px">Disbursed — payslips published to staff mobile, burn posted to the CEO board.</p>`), { icon: "banknote" })}
        <div class="grid cols-3">
          ${kpi("Staff in run", String(DATA.org().runStaff), "joiners prorated")}
          ${kpi("Gross", DATA.org().gross, "earnings + OT + allowances")}
          ${kpi("Net payout", DATA.org().net, "after PIT + SSO")}
        </div>
        ${card("Pay lines (sample)", table(
          [{ h: "Employee" }, { h: "Basic", r: 1 }, { h: "OT", r: 1 }, { h: "PIT", r: 1 }, { h: "SSO", r: 1 }, { h: "Net", r: 1 }],
          [
            { cells: ["Souksavanh P.", `<span class="num">${kip(4200000)}</span>`, `<span class="num">${kip(540000)}</span>`, `<span class="num" style="color:var(--bad)">− ${kip(468000)}</span>`, `<span class="num" style="color:var(--bad)">− ${kip(310200)}</span>`, `<b class="num">${kip(4862000)}</b>`] },
            { cells: ["Manysone V.", `<span class="num">${kip(3900000)}</span>`, `<span class="num">${kip(495000)}</span>`, `<span class="num" style="color:var(--bad)">− ${kip(402000)}</span>`, `<span class="num" style="color:var(--bad)">− ${kip(286000)}</span>`, `<b class="num">${kip(4307000)}</b>`] },
            { cells: ["Keo S.", `<span class="num">${kip(3600000)}</span>`, `<span class="num">${kip(648000)}</span>`, `<span class="num" style="color:var(--bad)">− ${kip(380000)}</span>`, `<span class="num" style="color:var(--bad)">− ${kip(264000)}</span>`, `<b class="num">${kip(3964000)}</b>`] }
          ]), { icon: "list" })}`
      };
    },

    docs() {
      return {
        title: "Documents", sub: "Vault + generation: issue any letter from System-Admin templates — serialized, e-signed, logged.",
        body: `
        <div class="grid cols-3">
          ${kpi("Expiring ≤ 30 d", "7", "3 contracts · 4 licenses", { hero: 1 })}
          ${kpi("Policy ack rate", "92%", "Code of conduct v4")}
          ${kpi("Generated MTD", "41", "self-serve 28 · HR 13")}
        </div>
        <div class="grid cols-2" style="margin-top:16px">
          ${card("Generate now", `<div class="choice-row" style="margin-bottom:12px">
            <button class="choice" data-act="toast:Employment letter — pick employee, serial auto-assigned">${icon("file")} Employment letter</button>
            <button class="choice" data-act="toast:Salary certificates — bulk for Finance div (22)">${icon("banknote")} Salary certificate</button>
            <button class="choice" data-act="toast:Contract renewals — 3 expiring contracts pre-filled">${icon("refresh")} Contract renewal</button>
          </div><p class="small muted">Each pulls merge fields from the people-ledger and routes via flow J (DOC-####).</p>`, { icon: "sparkle" })}
          ${card("Expiry watchlist", rowlist([
          rowitem({ icon: "alert", title: "3 contracts — Jul 2026", sub: "Davone P. +2 · renewal letters ready", side: badge("expiring") }),
          rowitem({ icon: "alert", title: "4 licenses — Q3", sub: "Forklift ×2 · electrician ×2", side: badge("expiring") }),
          rowitem({ icon: "check", title: "Visas / work permits", sub: "none expiring ≤ 90 d", side: badge("ok") })
        ]), { icon: "bell" })}
        </div>`
      };
    },

    reports() {
      return {
        title: "Reports", sub: "Each section keeps its last 3 generated runs with query detail — click a run to view (read-only) or use its download link. Older runs move to file storage, one folder per report.",
        actions: `<button class="btn ghost" data-go="hr/web/report-files">${icon("folder")} File storage</button>`,
        body: REP.library("hr", "hr/web")
      };
    },

    /* ---------- v2.3.2.db — run viewer (view-only snapshot + download link) ---------- */
    "report-run"(param) {
      const p = REP.runPage(param, "hr", "hr/web");
      return {
        title: p.title, sub: p.sub,
        crumbs: [{ label: "Reports", go: "hr/web/reports" }, { label: p.run ? p.run.id : "run" }],
        actions: p.run ? `${idtag(p.run.id)} ${p.run.archived ? `<span class="badge plain">archived</span>` : `<span class="badge ok plain">recent</span>`}` : "",
        body: p.body
      };
    },

    /* ---------- v2.3.2.db — file storage (archive, one folder per report) ---------- */
    "report-files"() {
      const f = REP.filesPage("hr", "hr/web");
      return {
        title: "Report file storage", sub: "Runs older than the last 3 are hidden here — one folder per report, view-only with download links. Retention expires files beyond 12 per report.",
        crumbs: [{ label: "Reports", go: "hr/web/reports" }, { label: "File storage" }],
        body: f.kpis + f.folders
      };
    }
  };

  /* ---------- MOBILE (light) ---------- */
  const mobile = {
    queue() {
      return {
        title: "Queue", body: `
        <div class="grid cols-2">${kpi("L2 items", String(DATA.pendingL2().length + 22), "waiting", { hero: 1 })}${kpi("Present", "95.1%", "236 of 248")}</div>
        ${card("Settle", l2queue("mobile", true), { icon: "inbox" })}
        ${card("Cross-module", rowlist([
          rowitem({ icon: "edit", title: "TC-0109 · ledger adjust", sub: "Latsamy V.", side: `<button class="btn xs soft" data-act="toast:Posted">Post</button>` }),
          rowitem({ icon: "file", title: "DOC-0290 · salary cert", sub: "Manysone V.", side: `<button class="btn xs soft" data-act="toast:Generated & e-signed">Go</button>` })
        ]), { icon: "layers" })}`
      };
    },
    alerts() {
      return {
        title: "Alerts", body: card("Today", rowlist([
          rowitem({ icon: "banknote", title: "Payroll cut-off in 15 d", sub: "PR-2026-06 still in draft", side: badge("draft") }),
          rowitem({ icon: "alert", title: "3 contracts expiring", sub: "Renewal letters ready", side: badge("expiring") }),
          rowitem({ icon: "x", title: "LINE channel down", sub: "SysAdmin notified 09:31", side: badge("failed") }),
          rowitem({ icon: "shield", title: "2 compliance flags", sub: "No-show ladder · Production", side: badge("flagged") })
        ]), { icon: "bell" })
      };
    },
    me() {
      const m = DATA.me.hr;
      return {
        title: "Me", body: `
        ${card("", `<div style="display:flex;align-items:center;gap:12px">${avatar(m.name, 1)}<div><div style="font-weight:800">${m.name}</div><div class="small muted">${m.role}</div></div></div>`)}
        ${card("Mobile is deliberately light", `<p class="small muted">Queue, alerts and profile only — the full HR console (payroll, people, comms) lives on web. That split is a v2.3 design decision, not a gap.</p>`, { icon: "sparkle" })}`
      };
    },
    approval(id) {
      const r = DATA.requests.find(x => x.id === id) || DATA.requests[0];
      return {
        title: r.id, back: "hr/mobile/queue", body: `
        ${card("", `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">${idtag(r.id)}${badge(r.status)}</div>
        <h3 style="font-size:16px;margin:10px 0 2px">${r.who} · ${r.detail}</h3><div class="small muted">L1 ✓ · ${r.dates}</div>`)}
        ${r.status === "pending" ? `<div style="display:flex;gap:9px"><button class="btn ok" style="flex:1" data-act="approve:${r.id}">${icon("check")} Settle</button><button class="btn danger" style="flex:1" data-act="return:${r.id}">${icon("x")} Return</button></div>` : ""}`
      };
    }
  };

  PERSONAS.hr = {
    key: "hr", label: t("personas.hr"), icon: "pulse",
    appName: "Adeptio Ops", roleLine: "HR Operations Console",
    domain: "admin.adeptio.hr/pulse",
    nav: [
      { group: "Work", items: [
        { id: "pulse", icon: "pulse", label: t("hr.pulse") },
        { id: "approvals", icon: "inbox", label: t("hr.approvals"), lock: "l2", count: () => DATA.pendingL2().length + 22 },
        { id: "comms", icon: "megaphone", label: t("hr.comms") }
      ]},
      { group: "Modules", items: [
        { id: "people", icon: "users", label: t("hr.people") },
        { id: "time", icon: "clock", label: t("hr.time") },
        { id: "leave", icon: "sun", label: t("hr.leave") },
        { id: "payroll", icon: "banknote", label: t("hr.payroll") },
        { id: "docs", icon: "folder", label: t("hr.docs"), lock: "vault" }
      ]},
      { group: "Insight", items: [{ id: "reports", icon: "chart", label: t("hr.reports") }] },
      { group: "Data", items: [{ id: "data", icon: "layers", label: "Data manager" }] }
    ],
    parent: { approval: "approvals", person: "people", "person-new": "people", "payroll-run": "payroll", "report-run": "reports", "report-files": "reports" },
    tabs: [
      { id: "queue", icon: "inbox", label: "Queue", lock: "l2" },
      { id: "alerts", icon: "bell", label: "Alerts" },
      { id: "me", icon: "user", label: "Me" }
    ],
    tabParent: { approval: "queue" },
    web, mobile
  };
})();
