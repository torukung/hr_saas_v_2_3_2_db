/* ============================================================
   ADEPTIO · MANAGER persona (MSS) — sage
   Web: Overview · Approvals(→detail) · Team(→member) · Schedule · Reports
   Mobile: Home · Approvals · Team · Alerts (+ drills)
   Approve / Return actually mutate the shared ledger.
   ============================================================ */
(function () {
  const { icon, kpi, card, badge, idtag, rowitem, rowlist, table, steps, empty, avatar, sparkline, bars, heatcal } = UI;

  const present = () => DATA.team.filter(m => m.state === "present").length;

  function queue(device, compact) {
    const q = DATA.pendingL1();
    if (!q.length) return empty("check", "Queue clear", "No L1 approvals waiting — nice.");
    return q.map(r => `
      <div class="qrow">
        <div class="qmain" data-go="manager/${device}/approval/${r.id}" role="button" tabindex="0">
          <div class="qt">${idtag(r.id)} ${UI.esc(r.who.split(" ")[0])} · ${UI.esc(r.detail)} <span class="sla">${r.sla}</span></div>
          <div class="qs">${r.dates} · submitted ${r.submitted}</div>
        </div>
        <div class="qact">
          <button class="btn ok sm" data-act="approve:${r.id}" aria-label="Approve ${r.id}">${icon("check")}${compact ? "" : " " + t("common.approve")}</button>
          <button class="btn danger sm" data-act="return:${r.id}" aria-label="Return ${r.id}">${icon("x")}${compact ? "" : " " + t("common.return")}</button>
        </div>
      </div>`).join("");
  }

  function teamBoard(device) {
    return rowlist(DATA.team.map(m => rowitem({
      avatar: m.name,
      title: m.name,
      sub: `${m.pos} · in ${m.in}`,
      side: badge(m.state),
      go: `manager/${device}/member/${m.id}`
    })));
  }

  /* ---------- WEB ---------- */
  const web = {
    overview() {
      const pend = DATA.pendingL1().length;
      return {
        title: "Team overview", sub: "Production Line A · Wednesday, Jun 10 — approvals first, then the day.",
        actions: `<button class="btn soft" data-act="toast:Nudge sent to 1 late, 1 absent">${icon("megaphone")} Message team</button>
                  <button class="btn" data-go="manager/web/approvals">${icon("inbox")} Open queue${pend ? ` · ${pend}` : ""}</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Present", `${present()} / ${DATA.team.length}`, `<span class="up">▲</span> on shift now`, { hero: 1 })}
          ${kpi("Pending L1", String(pend), "Oldest · LV-0481")}
          ${kpi("On leave", "1", "Somphone · annual")}
          ${kpi("OT this week", "12.5 h", "Cap 40h · healthy")}
        </div>
        <div class="grid cols-3" style="margin-top:16px">
          <div class="span-2" style="display:flex;flex-direction:column;gap:16px">
            ${card("Approvals waiting · L1", queue("web"), { icon: "inbox", link: "manager/web/approvals" })}
            ${card("Team today", teamBoard("web"), { icon: "users", link: "manager/web/team" })}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Alerts", rowlist([
          rowitem({ icon: "alert", title: "Keo — no-show today", sub: "2nd this month · policy ladder step 1", side: `<button class="btn xs soft" data-act="toast:Coaching note recorded (PV flow)">Coach</button>` }),
          rowitem({ icon: "clock", title: "Noy — late 09:12", sub: "+42 min · auto-flagged", side: badge("late") }),
          rowitem({ icon: "user", title: "Probation review due", sub: "Chanthala · by Jun 15", side: badge("pending") })
        ]), { icon: "bell" })}
            ${card("Attendance — 30 days", sparkline(DATA.attendanceTrend) + `<div class="small muted" style="margin-top:8px">Team average <b class="num" style="color:var(--ink)">95.1%</b> · trending steady</div>`, { icon: "trend" })}
            ${card("My submissions to HR", rowlist([
          rowitem({ icon: "send", title: "Team OT batch · May", sub: "OT-B-0512 · sent to payroll", side: badge("approved") })
        ]), { icon: "send" })}
          </div>
        </div>`
      };
    },

    approvals() {
      const pend = DATA.pendingL1();
      return {
        title: "Approvals — L1 queue", sub: "Inline approve / return with SLA timers. Claims you approve continue to HR / Finance (L2).",
        actions: `<button class="btn ghost" data-act="toast:All caught up — nothing auto-approvable">${icon("check")} Approve all routine</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Waiting", String(pend.length), "in your queue", { hero: 1 })}
          ${kpi("Avg. response", "3.2 h", "last 30 days")}
          ${kpi("Returned", "1", "this week")}
          ${kpi("SLA breaches", "0", "this month")}
        </div>
        ${card("Queue", queue("web"), { icon: "inbox" })}
        ${card("Recently decided", rowlist(DATA.requests.filter(r => r.status !== "pending").map(r => rowitem({
          icon: "check", neutral: r.status !== "approved",
          title: `${r.id} · ${r.who.split(" ")[0]} · ${r.detail}`,
          sub: r.stage, side: badge(r.status), go: `manager/web/approval/${r.id}`
        }))), { icon: "history" })}`
      };
    },

    approval(id) {
      const r = DATA.requests.find(x => x.id === id) || DATA.requests[0];
      const conflict = r.type === "Leave";
      return {
        title: `${r.type} — ${r.who.split(" ")[0]}`, sub: `Decide with context: balance, schedule and team conflicts inline.`,
        crumbs: [{ label: "Approvals", go: "manager/web/approvals" }, { label: r.id }],
        actions: `${idtag(r.id)} ${badge(r.status)}`,
        body: `
        <div class="grid cols-3">
          <div class="span-2" style="display:flex;flex-direction:column;gap:16px">
            ${card("Request", table([{ h: "Field" }, { h: "Value" }], [
          { cells: ["Who", `${r.who} ${idtag("EMP")}`] },
          { cells: ["What", r.detail] }, { cells: ["When", r.dates] },
          { cells: ["Note", r.note] }, { cells: ["Submitted", r.submitted] },
          { cells: ["SLA", `<span class="sla">${r.sla}</span>`] }
        ]), { icon: "file" })}
            ${conflict ? card("Team conflict check — Jun 18 & 19", `
              <div class="small muted" style="margin-bottom:10px">1 overlap on the same days — still above minimum crew of 6.</div>
              ${rowlist([
          rowitem({ avatar: "Somphone Inthavong", title: "Somphone — on leave Jun 16–19", sub: "Annual · approved LV-0468", side: badge("onleave") }),
          rowitem({ avatar: "Bounmy Latsavong", title: "Crew available Jun 18–19", sub: "7 of 8 present after this approval", side: badge("ok") })
        ])}`, { icon: "calendar" }) : card("Schedule check", `<p class="small muted">Within OT cap (40h/week) and roster window. Payroll applies rate & cap rules at L2 automatically.</p>`, { icon: "check" })}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${r.status === "pending" ? card("Decide", `
              <div style="display:flex;flex-direction:column;gap:8px">
                <button class="btn ok" data-act="approve:${r.id}">${icon("check")} ${t("common.approve")}${r.type === "Claim" ? " → HR / Finance" : ""}</button>
                <button class="btn danger" data-act="return:${r.id}">${icon("x")} ${t("common.return")} with note</button>
                ${DATA.has("delegation") ? `<button class="btn ghost" data-act="toast:Delegated to acting supervisor">${icon("users")} Delegate</button>` : UI.lockBtn("Delegate", DATA.unlockLabel("delegation"), "ghost")}
              </div>`, { icon: "settings" }) : card("Decided", `<p class="small muted">This item is ${r.status} — see the audit ledger for the trail.</p>`, { icon: "check" })}
            ${card("Requester snapshot", rowlist([
          rowitem({ icon: "check", title: "Attendance 98%", sub: "90-day", side: "" }),
          rowitem({ icon: "sun", title: "Leave balance 12 d", sub: "After request: 10 d", side: "" }),
          rowitem({ icon: "history", title: "Last request", sub: "EX-0210 · pending L2", side: "" })
        ]), { icon: "user" })}
          </div>
        </div>`
      };
    },

    team() {
      return {
        title: "Team — Production Line A", sub: "8 reports · live state from the attendance ledger.",
        actions: `<button class="btn soft" data-act="toast:Team report queued — delivered to your inbox">${icon("download")} Team report</button>`,
        body: `
        <div class="grid cols-4">
          ${kpi("Present", `${present()}/8`, "on shift", { hero: 1 })}
          ${kpi("Avg attendance", "94.8%", "90-day")}
          ${kpi("Leave liability", "74 d", "accrued team total")}
          ${kpi("OT MTD", "58 h", "vs 64 budget")}
        </div>
        ${card("Roster", table(
          [{ h: "Member" }, { h: "Position" }, { h: "Today" }, { h: "Attend.", r: 1 }, { h: "OT MTD", r: 1 }, { h: "Leave", r: 1 }],
          DATA.team.map(m => ({
            go: `manager/web/member/${m.id}`,
            cells: [
              `<div style="display:flex;align-items:center;gap:10px">${avatar(m.name)}<div><div class="strong">${m.name}</div><div class="small muted">${m.id}</div></div></div>`,
              m.pos, badge(m.state), `<span class="num">${m.attend}%</span>`, `<span class="num">${m.ot} h</span>`, `<span class="num">${m.leaveBal} d</span>`
            ]
          }))), { icon: "users" })}`
      };
    },

    member(id) {
      const m = DATA.team.find(x => x.id === id) || DATA.team[0];
      return {
        title: m.name, sub: `${m.pos} · ${m.id} · your direct report — scoped view, not the HR master record.`,
        crumbs: [{ label: "Team", go: "manager/web/team" }, { label: m.name.split(" ")[0] }],
        actions: `${badge(m.state)}`,
        body: `
        <div class="grid cols-3">
          ${kpi("Attendance", m.attend + "%", "90-day", { hero: 1 })}
          ${kpi("OT MTD", m.ot + " h", "within cap")}
          ${kpi("Leave balance", m.leaveBal + " d", "annual")}
        </div>
        <div class="grid cols-2" style="margin-top:16px">
          ${card("June attendance", heatcal({ until: 10, levels: m.state === "absent" ? { 10: "bad", 3: "bad" } : m.state === "late" ? { 10: "l1" } : {} }), { icon: "calendar" })}
          ${card("Recent items", rowlist(DATA.requests.filter(r => r.who === m.name).map(r => rowitem({
          icon: "inbox", title: `${r.id} · ${r.detail}`, sub: r.stage, side: badge(r.status), go: `manager/web/approval/${r.id}`
        })).concat(rowitem({ icon: "history", title: "Schedule — Shift A", sub: "Mon–Fri 08:30–17:30", side: `<button class="btn xs ghost" data-go="manager/web/schedule">Edit</button>` }))), { icon: "history" })}
        </div>`
      };
    },

    schedule() {
      const days = ["Mon 8", "Tue 9", "Wed 10", "Thu 11", "Fri 12", "Sat 13", "Sun 14"];
      const shift = (label, tone) => `<td><span class="badge ${tone}">${label}</span></td>`;
      return {
        title: "Schedule — week 24", sub: "Shift templates and rotations live in the Time cell; edits publish to staff mobile instantly.",
        actions: `<button class="btn ghost" data-act="toast:Week duplicated to week 25">${icon("files")} Duplicate week</button><button class="btn" data-act="toast:Schedule published — team notified via push">${icon("send")} Publish</button>`,
        body: card("", `<div class="tablewrap"><table class="tbl">
          <thead><tr><th>Member</th>${days.map(d => `<th>${d}</th>`).join("")}</tr></thead>
          <tbody>${DATA.team.slice(0, 6).map((m, i) => `<tr>
            <td><div class="strong" style="white-space:nowrap">${m.name.split(" ")[0]}</div></td>
            ${days.map((d, j) => j === 5 && i % 3 === 0 ? shift("OT 4h", "warn") : j >= 5 ? `<td><span class="small muted">—</span></td>` : (m.state === "onleave" && j < 2) ? shift("Leave", "") : shift("A · 08:30", "acc")).join("")}
          </tr>`).join("")}</tbody></table></div>
          <p class="small muted" style="margin-top:12px">${icon("sparkle", "")} Drag-to-assign and rotation templates arrive with the real Time & Attendance cell — this frame fixes the layout contract.</p>`, { icon: "calendar" })
      };
    },

    /* ---------- v2.3.2.db — team slice of the split stores ---------- */
    teamdata() {
      return {
        title: "Team data", sub: "Your team's rows in db_people and db_workflow — scoped by RBAC, addable & deletable so the live DB is easy to grasp.",
        actions: `<button class="btn ghost" data-act="toast:Team data extract queued — scoped to Production Line A">${icon("download")} Export team slice</button>`,
        body: `
        <div class="grid cols-3">
          <div class="span-2" style="display:flex;flex-direction:column;gap:16px">
            ${card("Roster — db_people.employees (team Line A)", DBV.tableEditor("db_people", "employees", { filter: e => e.team === "Line A" }) + `<span class="hint">Tip: set <b>team</b> to “Line A” when adding so the new member appears on your roster, attendance board and schedule instantly — one write, many lenses.</span>`, { icon: "users" })}
            ${card("Team requests — db_workflow.requests", DBV.tableEditor("db_workflow", "requests", { canAdd: false, canDel: false }) + `<p class="small muted" style="margin-top:8px">Decisions happen in the Approvals queue (the cell API) — the table here is the store truth those buttons mutate.</p>`, { icon: "inbox" })}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${card("Assign existing staff to Line A", `
              <div class="field"><label>Staff member</label>
                <select class="input" id="mg-assign">${DATA.employees.filter(e => e.team !== "Line A").map(e => `<option value="${e.id}">${e.name} · ${e.pos} (${e.div})</option>`).join("")}</select>
              </div>
              <button class="btn soft" style="width:100%" data-act="mgr-assign">${icon("users")} Assign to my team</button>
              <p class="small muted" style="margin-top:10px">Sets <b>team → Line A</b> on the db_people row — roster, attendance board and schedule pick it up on the same write. New hires are created by HR (People &amp; Org → New hire); managers assign, never create.</p>`, { icon: "plus" })}
            ${card("Stores you touch", DBV.storeGrid(null, ["db_people", "db_time", "db_leave", "db_workflow"]), { icon: "layers" })}
            ${card("One writer per store", `<p class="small muted">Approving ${idtag("LV-0481")} writes <b>db_workflow</b> only; the fact lands on <b>db_audit</b>; the projector updates <b>dw_reports</b>. A bad write in leave can never reach payroll — corruption stays inside one file.</p>`, { icon: "shield" })}
          </div>
        </div>`
      };
    },

    reports() {
      return {
        title: "Team reports", sub: "Scoped to your team by RBAC — same report library HR uses, narrower lens.",
        body: `
        <div class="grid cols-3">
          ${["Team attendance — June", "OT summary — June", "Leave calendar — Q3"].map((r, i) => card(r, `
            <p class="small muted" style="margin-bottom:12px">${["Daily present / late / absent matrix.", "Hours by member vs cap, cost preview.", "Approved + pending leave, conflict view."][i]}</p>
            <div style="display:flex;gap:8px">
              <button class="btn sm soft" data-act="toast:${r} — generated (PDF)">${icon("eye")} Preview</button>
              ${DATA.has("scheduledReports") ? `<button class="btn sm ghost" data-act="toast:${r} — scheduled monthly to your inbox">${icon("send")} Schedule</button>` : UI.lockBtn("Schedule", DATA.unlockLabel("scheduledReports"))}
            </div>`, { icon: "chart" })).join("")}
        </div>`
      };
    }
  };

  /* ---------- MOBILE ---------- */
  const mobile = {
    home() {
      const pend = DATA.pendingL1().length;
      return {
        title: "Team", body: `
        <div class="grid cols-2">
          ${kpi("Present", `${present()}/8`, "now", { hero: 1 })}
          ${kpi("Waiting", String(pend), "L1 queue")}
        </div>
        ${card("Approve now", queue("mobile", true), { icon: "inbox" })}
        ${card("Alerts", rowlist([
          rowitem({ icon: "alert", title: "Keo — no-show", sub: "Coach on policy ladder", side: badge("absent") }),
          rowitem({ icon: "clock", title: "Noy — late 09:12", sub: "+42 min", side: badge("late") })
        ]), { icon: "bell" })}`
      };
    },
    approvals() {
      return { title: "Approvals", body: queue("mobile", true) + card("Decided", rowlist(DATA.requests.filter(r => r.status !== "pending").slice(0, 3).map(r => rowitem({ icon: "check", neutral: 1, title: r.id + " · " + r.detail, sub: r.stage, side: badge(r.status) }))), { icon: "history" }) };
    },
    team() {
      return { title: "Team", body: card("Production Line A", teamBoard("mobile"), { icon: "users" }) };
    },
    alerts() {
      return {
        title: "Alerts", body: card("Today", rowlist([
          rowitem({ icon: "alert", title: "No-show — Keo", sub: "Auto-flagged 09:00 · PV ladder", side: badge("absent") }),
          rowitem({ icon: "clock", title: "Late — Noy 09:12", sub: "Auto-flagged · +42 min", side: badge("late") }),
          rowitem({ icon: "user", title: "Probation review — Chanthala", sub: "Due Jun 15", side: badge("pending") }),
          rowitem({ icon: "inbox", title: "SLA reminder — LV-0481", sub: "14h left on your queue", side: badge("pending"), go: "manager/mobile/approval/LV-0481" })
        ]), { icon: "bell" })
      };
    },
    approval(id) {
      const r = DATA.requests.find(x => x.id === id) || DATA.requests[0];
      return {
        title: r.id, back: "manager/mobile/approvals", body: `
        ${card("", `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">${idtag(r.id)}${badge(r.status)}</div>
          <h3 style="font-size:16px;margin:10px 0 2px">${r.who.split(" ")[0]} · ${r.detail}</h3>
          <div class="small muted">${r.dates} · ${r.note}</div>`)}
        ${r.status === "pending" ? `<div style="display:flex;gap:9px">
          <button class="btn ok" style="flex:1" data-act="approve:${r.id}">${icon("check")} Approve</button>
          <button class="btn danger" style="flex:1" data-act="return:${r.id}">${icon("x")} Return</button></div>` : ""}
        ${card("Snapshot", rowlist([
          rowitem({ icon: "check", title: "Attendance 98%", sub: "90-day" }),
          rowitem({ icon: "sun", title: "Balance after: 10 d", sub: "Annual leave" })
        ]), { icon: "user" })}`
      };
    },
    member(id) {
      const m = DATA.team.find(x => x.id === id) || DATA.team[0];
      return {
        title: m.name.split(" ")[0], back: "manager/mobile/team", body: `
        ${card("", `<div style="display:flex;align-items:center;gap:12px">${avatar(m.name, 1)}<div><div style="font-weight:800">${m.name}</div><div class="small muted">${m.pos} · ${m.id}</div></div></div>`)}
        <div class="grid cols-2">${kpi("Attend.", m.attend + "%", "90-day")}${kpi("OT", m.ot + " h", "MTD")}</div>
        ${card("June", heatcal({ until: 10 }), { icon: "calendar" })}`
      };
    }
  };

  PERSONAS.manager = {
    key: "manager", label: t("personas.manager"), icon: "users",
    appName: "Adeptio Team", roleLine: "Manager Self-Service",
    domain: "app.adeptio.hr/team",
    nav: [
      { group: "Work", items: [
        { id: "overview", icon: "home", label: t("mgr.overview") },
        { id: "approvals", icon: "inbox", label: t("mgr.approvals"), count: () => DATA.pendingL1().length },
        { id: "team", icon: "users", label: t("mgr.team") }
      ]},
      { group: "Plan", items: [
        { id: "schedule", icon: "calendar", label: t("mgr.schedule") },
        { id: "reports", icon: "chart", label: t("mgr.reports") },
        { id: "teamdata", icon: "layers", label: "Team data" }
      ]}
    ],
    parent: { approval: "approvals", member: "team" },
    tabs: [
      { id: "home", icon: "home", label: "Home" },
      { id: "approvals", icon: "inbox", label: "Approvals" },
      { id: "team", icon: "users", label: "Team" },
      { id: "alerts", icon: "bell", label: "Alerts" }
    ],
    tabParent: { approval: "approvals", member: "team" },
    web, mobile
  };
})();
