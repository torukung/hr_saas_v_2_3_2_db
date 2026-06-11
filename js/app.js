/* ============================================================
   ADEPTIO · app shell — router, launcher, shells, actions
   Route shape:  #/{persona}/{device}/{screen}[/{param}]
   e.g. #/hr/web/payroll-run/PR-2026-06 · #/staff/mobile/home
   ============================================================ */
(function () {
  const { icon, badge, avatar } = UI;
  const app = () => document.getElementById("app");

  const PERSONA_META = {
    staff:    { vars: ["--staff", "--staff-d", "--staff-bg", "--staff-ln"], who: "STAFF · ESS", h: "The Employee", tag: "Self-service — does the day-to-day", pts: ["Clock in / out — app, GPS, web", "Request leave · OT · claims", "Payslips & tax / SSO breakdown", "Profile & documents"] },
    manager:  { vars: ["--mgr", "--mgr-d", "--mgr-bg", "--mgr-ln"], who: "MANAGER · MSS", h: "The Team Lead", tag: "Oversees a team — first approver", pts: ["Approve / return requests (L1)", "Team roster, shifts & calendar", "Live attendance board", "Coaching on policy exceptions"] },
    hr:       { vars: ["--hr", "--hr-d", "--hr-bg", "--hr-ln"], who: "HR · PEOPLE OPS", h: "The HR Operator", tag: "Runs people, pay & communications", pts: ["Master data & org structure", "Payroll runs · tax · SSO", "Compose & send communications", "Final approvals (L2) & reports"] },
    ceo:      { vars: ["--ceo", "--ceo-d", "--ceo-bg", "--ceo-ln"], who: "CEO · SHAREHOLDER", h: "The Executive", tag: "Strategic oversight — read-only", pts: ["Headcount & labor cost", "Payroll burn vs budget", "Attrition & division compare", "Compliance / risk posture"] },
    sysadmin: { vars: ["--sys", "--sys-d", "--sys-bg", "--sys-ln"], who: "SYSTEM ADMIN", h: "The Platform Owner", tag: "Owns content, channels & security", pts: ["Content templates — CMS", "Channels & gateways", "Roles, permissions & SSO", "Audit log & residency"] }
  };
  const ORDER = ["staff", "manager", "hr", "ceo", "sysadmin"];

  /* ---------- tier gating (v2.3.1.essential) ---------- */
  const personaLocked = (k) => (k === "ceo" && !DATA.has("ceo")) || (k === "sysadmin" && !DATA.has("sysadmin"));
  // flag that locks a screen, resolved through its owning nav/tab item
  function screenLock(P, dev, screen) {
    const owner = dev === "web" ? ((P.parent && P.parent[screen]) || screen) : ((P.tabParent && P.tabParent[screen]) || screen);
    const items = dev === "web" ? P.nav.flatMap(g => g.items) : P.tabs;
    const it = items.find(i => i.id === owner);
    return it && it.lock && !DATA.has(it.lock) ? it.lock : null;
  }
  function firstUnlocked(P, dev) {
    const items = dev === "web" ? P.nav.flatMap(g => g.items) : P.tabs;
    const it = items.find(i => !(i.lock && !DATA.has(i.lock)));
    return (it || items[0]).id;
  }

  /* ---------- routing ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    if (!h || h === "launcher") return { view: "launcher" };
    const [persona, device, screen, ...rest] = h.split("/");
    if (!PERSONAS[persona]) return { view: "launcher" };
    const P = PERSONAS[persona];
    const dev = device === "mobile" ? "mobile" : "web";
    if (personaLocked(persona)) {
      return { view: "launcher", blocked: `${P.label} persona unlocks at Professional (≤250) — locked on Essential. Use the tier toggle to preview.` };
    }
    let scr = (P[dev][screen] ? screen : firstUnlocked(P, dev));
    let blocked;
    const lk = screenLock(P, dev, scr);
    if (lk) {
      blocked = `That area unlocks at ${DATA.unlockLabel(lk)} — locked on Essential.`;
      scr = firstUnlocked(P, dev);
    }
    return { view: "app", persona, device: dev, screen: scr, blocked, param: rest.length ? decodeURIComponent(rest.join("/")) : undefined };
  }
  function go(path) { location.hash = "#/" + path; }
  window.go = go;

  /* ---------- toast ---------- */
  let toastWrap;
  window.toast = function (msg, tone) {
    if (!toastWrap) { toastWrap = document.createElement("div"); toastWrap.className = "toast-wrap"; document.body.appendChild(toastWrap); }
    const el = document.createElement("div");
    el.className = "toast" + (tone ? " " + tone : "");
    el.innerHTML = `${icon(tone === "warn" ? "alert" : "check")}<span>${msg}</span>`;
    toastWrap.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 350); }, 3400);
  };

  /* ---------- topbar ---------- */
  function topbar(r) {
    const onApp = r.view === "app";
    const cur = onApp ? r.persona : null;
    const ess = DATA.tier() === "essential";
    const chips = ORDER.map(k => {
      const m = PERSONA_META[k];
      const locked = personaLocked(k);
      const action = locked
        ? `data-act="${UI.lockMsg(PERSONAS[k].label + " persona", "Professional · ≤250")}"`
        : `data-go="${k}/${onApp ? r.device : "web"}/${k === cur && onApp ? r.screen : defaultScreen(k, onApp ? r.device : "web")}"`;
      return `<button class="pchip ${locked ? "locked" : ""}" style="--pc:var(${m.vars[0]});--pd:var(${m.vars[1]});--pl:var(${m.vars[3]})"
        aria-pressed="${cur === k}" ${action} title="${locked ? "Unlocks at Professional ≤250" : PERSONAS[k].roleLine}">
        ${locked ? icon("lock", "lk") : '<span class="dot"></span>'}<span class="pl">${PERSONAS[k].label}</span></button>`;
    }).join("");
    const me = onApp ? DATA.me[r.persona] : null;
    return `<header class="topbar">
      <button class="logo" data-go="launcher" aria-label="Adeptio home">
        <span class="logo-mark">A</span>
        <span><span class="logo-word">Adeptio</span><br><span class="logo-sub">${t("app.suite")}</span></span>
      </button>
      <span class="ver">v2.3.2.db${ess ? " · essential" : " · pro"} · live DB</span>
      <nav class="persona-switch" aria-label="Persona">${chips}</nav>
      <span class="spacer"></span>
      <div class="seg tier" role="group" aria-label="License tier" title="R4 — flags, not forks: one codebase, tier-gated">
        <button aria-pressed="${ess}" data-act="set-tier:essential">Essential ≤50</button>
        <button aria-pressed="${!ess}" data-act="set-tier:professional">Pro ≤250</button>
      </div>
      ${onApp ? `<div class="seg" role="group" aria-label="Device">
        <button aria-pressed="${r.device === "web"}" data-go="${r.persona}/web/${webEquiv(r)}">${icon("globe")} ${t("nav.web")}</button>
        <button aria-pressed="${r.device === "mobile"}" data-go="${r.persona}/mobile/${mobileEquiv(r)}">${icon("phone")} ${t("nav.mobile")}</button>
      </div>` : ""}
      <div class="seg lang" role="group" aria-label="Language">
        <button aria-pressed="true">EN</button>
        <button aria-pressed="false" data-act="lang-lo">ລາວ</button>
      </div>
      ${me ? `<button class="avatar-btn" title="${me.name} · ${me.role}">${avatar(me.name)}</button>` : ""}
    </header>`;
  }
  function defaultScreen(p, dev) { return firstUnlocked(PERSONAS[p], dev); }
  // map current screen across devices, falling back to tab/nav parents then default
  function mobileEquiv(r) {
    const P = PERSONAS[r.persona];
    if (P.mobile[r.screen]) return r.screen + (r.param ? "/" + r.param : "");
    const tp = P.tabParent && P.tabParent[r.screen];
    if (tp && P.mobile[tp]) return tp;
    return P.tabs[0].id;
  }
  function webEquiv(r) {
    const P = PERSONAS[r.persona];
    if (P.web[r.screen]) return r.screen + (r.param ? "/" + r.param : "");
    const wp = { home: P.nav[0].items[0].id, queue: "approvals", alerts: P.nav[0].items[0].id, me: P.web.me ? "me" : P.nav[0].items[0].id, board: "board" }[r.screen];
    return (wp && P.web[wp]) ? wp : P.nav[0].items[0].id;
  }

  /* ---------- launcher ---------- */
  function launcher() {
    const cards = ORDER.map(k => {
      const m = PERSONA_META[k], P = PERSONAS[k];
      const locked = personaLocked(k);
      const enter = locked
        ? `<div class="enter"><button data-act="set-tier-go:${k}">${icon("key")} Unlock — preview at Pro</button></div>`
        : `<div class="enter">
            <button data-go="${k}/web/${defaultScreen(k, "web")}">${icon("globe")} Web</button>
            <button class="ghosted" data-go="${k}/mobile/${defaultScreen(k, "mobile")}" aria-label="${P.label} mobile">${icon("phone")}</button>
          </div>`;
      return `<article class="hub-card ${locked ? "locked" : ""}" ${locked ? `data-act="${UI.lockMsg(P.label + " persona", "Professional · ≤250")}"` : `data-go="${k}/web/${defaultScreen(k, "web")}"`} style="--pc:var(${m.vars[0]});--pd:var(${m.vars[1]});--pb:var(${m.vars[2]});--pl:var(${m.vars[3]})">
        ${locked ? `<span class="hub-lock">${icon("lock")} Pro ≤250</span>` : ""}
        <span class="swatch">${icon(P.icon)}</span>
        <span class="who">${m.who}</span>
        <h3>${m.h}</h3>
        <p class="tag">${locked ? (k === "sysadmin" ? "HR doubles on Essential — separate persona at Pro" : "Unlocks at Professional — Insight board") : m.tag}</p>
        <ul>${m.pts.map(p => `<li>${p}</li>`).join("")}</ul>
        ${enter}
      </article>`;
    }).join("");
    return `${topbar({ view: "launcher" })}
    <main class="launcher screen-fade">
      <div class="hero">
        <span class="eyebrow">Adeptio Adaptive HR · blueprint v2.3.2 (resilient data layer) → platform UI v2.3.2.db</span>
        <h1>One platform.<br><em>Five personas. Live database.</em></h1>
        <p class="lede">The v2.3.1 design contract, now running on the <strong>v2.3.2 split data layer</strong> — ten stores, one writer each, persisted per tenant × store on both tiers. Everything you add, approve or delete <strong>survives a reload</strong>; every write becomes a fact on db_audit. Sample rows are addable &amp; deletable everywhere — and the Backup Center snapshots, schedules and restores per module.</p>
      </div>
      <div class="hub-grid">${cards}</div>
      <div class="launch-meta">
        <span><b>${DATA.tier() === "essential" ? "Essential ≤50" : "Professional ≤250"}</b> tier flag</span>
        <span><b>5</b> personas</span><span><b>7+3+2</b> modules</span><span><b>10</b> live data stores</span>
        <span><b>${DB.backups.all().length}</b> snapshots in L-CU</span><span><b>B1·B2·B3</b> backup ladder</span>
        <span><b>50 · 100 · 250 · 600</b> seat tiers</span><span class="mono">persisted · ${DB.TENANT}-*</span>
      </div>
    </main>
    <footer class="footer-note">${icon("lock")} UI/UX preview for the dev team — structure &amp; flows per Blueprint v2.3 · no real data, no backend · © 2026 Adeptio.</footer>`;
  }

  /* ---------- web shell ---------- */
  function webShell(r) {
    const P = PERSONAS[r.persona];
    const def = P.web[r.screen](r.param);
    const activeNav = (P.parent && P.parent[r.screen]) || r.screen;
    const navHtml = P.nav.map(g => `
      <div class="group eyebrow">${g.group}</div>
      ${g.items.map(it => {
      const locked = it.lock && !DATA.has(it.lock);
      if (locked) return `<button class="nav-item locked" data-act="${UI.lockMsg(it.label, DATA.unlockLabel(it.lock))}" title="Unlocks at ${DATA.unlockLabel(it.lock)}">
          ${icon(it.icon)}<span class="lbl">${it.label}</span>${icon("lock", "lk")}</button>`;
      const cnt = typeof it.count === "function" ? it.count() : it.count;
      return `<button class="nav-item" aria-current="${activeNav === it.id}" data-go="${r.persona}/web/${it.id}">
          ${icon(it.icon)}<span class="lbl">${it.label}</span>${cnt ? `<span class="count">${cnt}</span>` : ""}</button>`;
    }).join("")}`).join("");

    const crumbs = def.crumbs
      ? `<nav class="crumbs" aria-label="Breadcrumb">
          <a data-go="${r.persona}/web/${defaultScreen(r.persona, "web")}">${P.label}</a>
          ${def.crumbs.map(c => `${icon("chevR")}${c.go ? `<a data-go="${c.go}">${c.label}</a>` : `<span class="here">${c.label}</span>`}`).join("")}
        </nav>`
      : `<nav class="crumbs" aria-label="Breadcrumb"><span class="mono" style="font-size:10.5px">${P.domain}</span></nav>`;

    return `${topbar(r)}
    <div class="shell">
      <aside class="rail" aria-label="${P.label} navigation">
        <div class="rail-head"><span class="pin">${icon(P.icon)}</span><div><div class="t">${P.appName}</div><div class="s">${P.roleLine}</div></div></div>
        ${navHtml}
        <div class="rail-foot">
          <div class="tier-chip"><span class="led"></span><span>${DATA.tier() === "essential" ? "Essential · ≤50 seats" : "Professional · ≤250 seats"}</span></div>
          <div class="note">${DATA.company.name}${DATA.tier() === "essential" ? " · pilot site" : ""} · ${DATA.org().headcount} staff<br>${DATA.tier() === "essential" ? `${icon("lock", "lk")} greyed = next tier · R4 flags, not forks` : "Sealed cells · split stores · §04–05"}</div>
        </div>
      </aside>
      <main class="workspace" id="ws">
        <div class="workspace-inner screen-fade">
          ${crumbs}
          <div class="screen-head">
            <div><h1>${def.title}</h1>${def.sub ? `<p class="sub">${def.sub}</p>` : ""}</div>
            ${def.actions ? `<div class="actions">${def.actions}</div>` : ""}
          </div>
          ${def.body}
        </div>
      </main>
    </div>`;
  }

  /* ---------- mobile shell ---------- */
  function mobileShell(r) {
    const P = PERSONAS[r.persona];
    const def = P.mobile[r.screen](r.param);
    const activeTab = (P.tabParent && P.tabParent[r.screen]) || r.screen;
    const tabs = P.tabs.map(tb => {
      const locked = tb.lock && !DATA.has(tb.lock);
      if (locked) return `<button class="tab locked" data-act="${UI.lockMsg(tb.label, DATA.unlockLabel(tb.lock))}">
        ${icon("lock")}<span>${tb.label}</span><span class="tdot"></span></button>`;
      return `<button class="tab" aria-current="${activeTab === tb.id}" data-go="${r.persona}/mobile/${tb.id}">
        ${icon(tb.icon)}<span>${tb.label}</span><span class="tdot"></span></button>`;
    }).join("");
    const me = DATA.me[r.persona];
    return `${topbar(r)}
    <div class="mobile-stage">
      <div class="phone" role="region" aria-label="${P.label} mobile app">
        <div class="phone-screen">
          <span class="island"></span>
          <div class="statusbar"><span>9:41</span><span class="icons">${icon("signal")}${icon("wifi")}${icon("battery")}</span></div>
          <div class="app-head">
            ${def.back ? `<button class="back" data-go="${def.back}" aria-label="${t("common.back")}">${icon("chevL")}</button>` : ""}
            <div style="min-width:0"><div class="ah-t">${def.title}</div><div class="ah-s">${P.appName} · ${me.name.split(" ")[0]}</div></div>
            <span style="flex:1"></span>
            <button class="bell" aria-label="Notifications">${icon("bell")}<span class="ping"></span></button>
          </div>
          <div class="app-body screen-fade" id="ab">${def.body}</div>
          <nav class="tabbar" aria-label="Tabs">${tabs}</nav>
          <div class="homebar"><i></i></div>
        </div>
      </div>
      <aside class="stage-aside">
        <div class="card"><h4>${P.label} · mobile frame</h4><p>${({
        staff: "Mobile-first ESS — one-tap clock-in hero, then requests and payslips. Tabs: Home · Time · Requests · Me.",
        manager: "Approvals-first. The queue is the home screen reflex — approve or return in two taps.",
        hr: DATA.has("l2") ? "Deliberately light: queue, alerts, profile. The full console stays on web — a v2.3 design decision." : "Deliberately light — alerts & profile. The L2 settle queue is a Growth+ feature; on Essential, managers complete approvals at L1.",
        ceo: "Four-metric snapshot, read-only. No edit controls exist anywhere in this app.",
        sysadmin: "Health & alerts only. Authoring stays on web; never shows employee records or pay."
      })[r.persona]}</p></div>
        <div class="card"><h4>Try the ledger</h4><p>${({
        staff: "Submit a request here, then switch to Manager → it appears in the L1 queue instantly.",
        manager: "Approve LV-0481, then open Staff → its status flips to Approved. One write, many lenses.",
        hr: DATA.has("l2") ? "Settle EX-0210 at L2 — it lands as a reimbursement line on pay run PR-2026-06." : "Flip the tier toggle to Pro and the L2 queue, vault and broadcast unlock in place — same codebase, one flag (R4).",
        ceo: "Numbers here are aggregates over the same rows the other lenses write — never copies.",
        sysadmin: "Any action you take lands on the audit tail — check Audit after approving anything."
      })[r.persona]}</p></div>
        <div class="card"><h4>Hand-off note</h4><p>Bottom tabs, back stack and safe-areas follow this frame 1:1 — see README → “Mobile contract”.</p></div>
      </aside>
    </div>`;
  }

  /* ---------- render ---------- */
  let lastRoute = "", lastBlocked = "";
  function render() {
    const r = route();
    document.body.dataset.persona = r.view === "app" ? r.persona : "";
    const ws = document.getElementById("ws") || document.getElementById("ab");
    const sameRoute = lastRoute === location.hash && lastRoute !== "";
    document.body.dataset.anim = sameRoute ? "off" : "on"; // ledger re-renders repaint without replaying entrances
    const keep = sameRoute ? (ws ? ws.scrollTop : window.scrollY) : 0;
    app().innerHTML = r.view === "launcher" ? launcher() : (r.device === "mobile" ? mobileShell(r) : webShell(r));
    document.title = r.view === "launcher" ? "Adeptio Adaptive HR — Platform UI v2.3.2.db"
      : `${PERSONAS[r.persona].label} · ${r.screen} — Adeptio`;
    if (keep) { const el = document.getElementById("ws") || document.getElementById("ab"); if (el) el.scrollTop = keep; else window.scrollTo(0, keep); }
    else window.scrollTo(0, 0);
    lastRoute = location.hash;
    if (r.blocked && lastBlocked !== location.hash + r.blocked) {
      lastBlocked = location.hash + r.blocked;
      toast(r.blocked, "warn");
    }
  }

  /* ---------- actions ---------- */
  function handleAct(act) {
    const [cmd, arg] = act.split(/:(.+)/);
    switch (cmd) {
      case "clock": {
        DATA.clock();
        toast(DATA.state.clockedIn ? "Clocked in · GPS verified inside geofence" : "Clocked out — see you tomorrow");
        break;
      }
      case "approve": {
        DATA.approve(arg);
        const r = DATA.requests.find(x => x.id === arg);
        toast(`${arg} ${r && r.stage.startsWith("L2") ? "approved → escalated to HR / Finance (L2)" : "approved — ledger, staff view & audit updated"}`);
        break;
      }
      case "return": { DATA.ret(arg); toast(arg + " returned to staff with a note", "warn"); break; }
      case "submit-request": {
        const id = DATA.submitRequest(arg, arg === "Claim" ? "Expense claim · ₭ 420,000" : arg === "Overtime" ? "Overtime · 2 hours" : arg === "Correction" ? "Punch correction · Jun 05" : "Annual leave · 2 days");
        toast(`${id} submitted — now in your manager's L1 queue`);
        const r = route();
        go(`${r.persona}/${r.device}/${r.device === "web" ? "request-detail" : "request-detail"}/${id}`);
        break;
      }
      case "advance-run": { DATA.advanceRun(arg); const run = DATA.payrollRuns.find(x => x.id === arg); toast(`${arg} → ${run.state}${run.state === "disbursed" ? " · bank file exported, payslips published" : ""}`); break; }
      case "send-comms": { DATA.sendComms("Division · Production", ["Email", "Push"], 142); toast("Sent to ≈142 recipients on 2 channels — delivery tracking live"); break; }
      case "lang-lo": { toast("ລາວ pack is staged — UI strings are externalized (js/i18n.js), translations land in the build phase", "warn"); break; }
      case "locked": { toast(arg, "warn"); break; }
      case "set-tier": {
        DATA.setTier(arg);
        toast(arg === "essential" ? "Tier flag → Essential (≤50) — gated features grey out with a key-lock" : "Tier flag → Professional (≤250) — CEO board, System Admin, L2, vault & more unlock");
        break;
      }
      case "set-tier-go": { // unlock-and-preview from a locked persona card
        DATA.setTier("professional");
        toast("Tier flag → Professional (≤250) — previewing " + PERSONAS[arg].label);
        go(`${arg}/web/${defaultScreen(arg, "web")}`);
        break;
      }
      /* ---------- v2.3.2.db — staff lifecycle (add · delete · assign) ---------- */
      case "staff-add": { // New hire form (hr/web/person-new)
        const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
        const name = val("st-name");
        if (!name) { toast("Give the new hire a name first", "warn"); break; }
        const emp = DB.list("db_people", "employees");
        const next = emp.reduce((m, e) => Math.max(m, Number(String(e.id).replace(/\D/g, "")) || 0), 0) + 1;
        const id = "EMP-" + String(next).padStart(4, "0");
        DB.add("db_people", "employees", {
          id, name, pos: val("st-pos") || "Staff", div: val("st-div") || "Production", team: val("st-team") || "—",
          state: "present", in: DB.now(), attend: 100, ot: 0, leaveBal: 15, since: "Jun 2026", status: "probation"
        }, "Vilayvanh C.");
        DB.audit("Vilayvanh C.", "employee.hired", id + " · " + name, "10.0.4.12");
        toast(`${id} · ${name} created in db_people — probation, org KPIs re-derived`);
        go("hr/web/person/" + id);
        break;
      }
      case "staff-del": { // Offboard & remove (person detail)
        const emp = DB.list("db_people", "employees").find(e => e.id === arg);
        DB.del("db_people", "employees", "id", arg, "Vilayvanh C.");
        DB.audit("Vilayvanh C.", "employee.offboarded", arg + (emp ? " · " + emp.name : ""), "10.0.4.12");
        toast(`${arg} offboarded — record exported & removed, headcount re-derived`, "warn");
        go("hr/web/people");
        break;
      }
      case "staff-assign": { // Reassign division/team (person detail)
        const emp = DB.list("db_people", "employees").find(e => e.id === arg);
        if (!emp) break;
        const dv = document.getElementById("as-div"), tm = document.getElementById("as-team");
        if (dv) emp.div = dv.value;
        if (tm) emp.team = tm.value;
        DB.persist("db_people");
        DB.audit("Vilayvanh C.", "employee.reassigned", `${arg} → ${emp.div} · team ${emp.team}`, "10.0.4.12");
        toast(`${arg} reassigned → ${emp.div}${emp.team !== "—" ? " · " + emp.team : ""} — every lens updated`);
        DATA.pulse();
        break;
      }
      case "mgr-assign": { // Manager: pull an existing employee onto Line A
        const sel = document.getElementById("mg-assign");
        if (!sel || !sel.value) { toast("Pick a staff member to assign", "warn"); break; }
        const emp = DB.list("db_people", "employees").find(e => e.id === sel.value);
        if (!emp) break;
        emp.team = "Line A";
        DB.persist("db_people");
        DB.audit("Khamla S.", "employee.team_assigned", `${emp.id} · ${emp.name} → Line A`, "10.0.7.31");
        toast(`${emp.name} assigned to Line A — now on your roster, board and schedule`);
        DATA.pulse();
        break;
      }
      /* ---------- v2.3.2.db — database management actions ---------- */
      case "db-add": { // db-add:{store}:{table} — reads inputs from #dbf-{store}-{table}
        const [store, table] = arg.split(":");
        const box = document.getElementById(`dbf-${store}-${table}`);
        if (!box) break;
        const row = {};
        const sample = DB.list(store, table)[0] || {};
        box.querySelectorAll("[data-f]").forEach(inp => {
          const f = inp.getAttribute("data-f");
          let v = inp.value.trim();
          if (typeof sample[f] === "number") v = Number(v) || 0;
          row[f] = v;
        });
        const keyF = DBV.keyOf(store, table);
        if (!row[keyF]) { // auto-id from the existing pattern (shared-ID discipline)
          const m0 = String(sample[keyF] || "").match(/^([A-Z]{2,4})-0*(\d+)/);
          row[keyF] = m0 ? `${m0[1]}-${String(Number(m0[2]) + 400 + DB.list(store, table).length).padStart(4, "0")}` : "ROW-" + Date.now().toString().slice(-5);
        }
        // sensible defaults so new rows render nicely
        Object.keys(sample).forEach(k => { if (row[k] === undefined || row[k] === "") row[k] = typeof sample[k] === "number" ? 0 : Array.isArray(sample[k]) ? [] : (k === "state" ? "present" : k === "status" ? "active" : row[k] === "" ? "—" : sample[k] === null ? null : "—"); });
        DB.add(store, table, row, "console");
        toast(`Row ${row[keyF]} added to ${store}.${table} — persisted & audit-logged`);
        DATA.pulse();
        break;
      }
      case "db-del": { // db-del:{store}:{table}:{field}:{value}
        const [store, table, field, ...rest] = arg.split(":");
        const ok = DB.del(store, table, field, rest.join(":"), "console");
        toast(ok ? `Row removed from ${store}.${table} — the other ${DB.CATALOG.length - 1} stores never noticed` : "Row not found", ok ? undefined : "warn");
        DATA.pulse();
        break;
      }
      case "db-reset": {
        if (arg === "all") { DB.reset(null, "Thip N."); toast("All stores reseeded with sample data — registry, policies and audit refreshed"); }
        else { DB.reset(arg, "console"); toast(arg + " reseeded — blast radius: this store only"); }
        DATA.pulse();
        break;
      }
      case "db-factory": { // demo: clean slate — reseed every store AND clear the custodial snapshot area
        DB.reset(null, "Thip N."); // reseed first so the clear-fact below survives on the fresh audit ledger
        const n = DB.backups.clear("Thip N.");
        toast(`Factory reset — all stores reseeded, ${n} snapshot${n === 1 ? "" : "s"} cleared, schedules re-armed. Clean slate for the next demo.`);
        DATA.pulse();
        break;
      }
      case "backup-now": { // selectable, from the Backup Center checkboxes
        const ids = Array.from(document.querySelectorAll(".bk-sel:checked")).map(x => x.value);
        const lbl = (document.getElementById("bk-label") || {}).value || "";
        if (!ids.length) { toast("Pick at least one store to back up", "warn"); break; }
        const bk = DB.backups.now(ids, "manual", lbl || undefined, "Thip N.");
        toast(`${bk.id} — ${ids.length} store${ids.length > 1 ? "s" : ""}, ${bk.sizeKB} KB → custodial storage (L-CU)`);
        DATA.pulse();
        break;
      }
      case "backup-store": { // per-module snapshot
        const bk = DB.backups.now([arg], "manual", "Module snapshot · " + arg, "console");
        toast(`${bk.id} — ${arg} snapshotted alone (${bk.sizeKB} KB) · other modules untouched`);
        DATA.pulse();
        break;
      }
      case "store-restore": { // restore just this store from the newest snapshot containing it
        const bk = DB.backups.all().find(b => b.stores.includes(arg) && b.data[arg]);
        if (!bk) { toast("No snapshot holds " + arg + " yet — take one first", "warn"); break; }
        DB.backups.restore(bk.id, [arg], "console");
        toast(`${arg} restored from ${bk.id} (${bk.ts}) — restoring one module never rewinds another`);
        DATA.pulse();
        break;
      }
      case "backup-restore": {
        const ids = DB.backups.restore(arg, null, "Thip N.");
        toast(ids ? `${arg} restored → ${ids.length} store${ids.length > 1 ? "s" : ""} rewound to the snapshot` : "Snapshot not found", ids ? undefined : "warn");
        DATA.pulse();
        break;
      }
      case "backup-del": {
        DB.backups.remove(arg, "Thip N.");
        toast(arg + " expired from custodial storage (retention)", "warn");
        DATA.pulse();
        break;
      }
      case "backup-dl": {
        const bk = DB.backups.all().find(b => b.id === arg);
        if (bk) { download(`adeptio-${DB.TENANT}-${bk.id}.json`, { ...bk, note: "Portable export — the 'plain SQLite file' of this demo. Restores anywhere, no vendor account needed (P6)." }); toast(bk.id + " downloaded — vendor-independent copy in your custody"); }
        break;
      }
      case "db-export": {
        const ids = Array.from(document.querySelectorAll(".bk-sel:checked")).map(x => x.value);
        download(`adeptio-${DB.TENANT}-export.json`, DB.exportObj(ids.length ? ids : null));
        toast(`Exported ${ids.length || DB.CATALOG.length} store${(ids.length || 2) > 1 ? "s" : ""} as JSON — our custody, our keys`);
        break;
      }
      case "drill": {
        const d = DB.drill("Thip N.");
        toast(`Restore drill ${d.id} on ${d.target} — ${d.result.toUpperCase()} · ${d.checks}`, d.result === "pass" ? undefined : "warn");
        DATA.pulse();
        break;
      }
      case "dw-rebuild": {
        const n = DB.rebuildReports("Thip N.");
        toast(`dw_reports rebuilt by replaying ${n} facts from db_audit — derived views are disposable (P4)`);
        DATA.pulse();
        break;
      }
      case "pick": { return "pick"; } // handled inline by caller
      case "toast": default: toast(arg || "Done"); break;
    }
  }

  /* ---------- v2.3.2.db — file download helper ---------- */
  function download(name, obj) {
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    } catch (e) { toast("Download blocked by the browser — data is still safe in the store", "warn"); }
  }

  /* ---------- v2.3.2.db — schedule editor (selects & toggles) ---------- */
  document.addEventListener("change", (e) => {
    const f = e.target.closest(".sc-freq");
    if (f) { DB.setPolicy(f.getAttribute("data-store"), { freq: f.value, last: null }, "Thip N."); toast(`${f.getAttribute("data-store")} → ${f.value} exports · runs on the next scheduler tick`); DATA.pulse(); return; }
    const o = e.target.closest(".sc-on");
    if (o) { DB.setPolicy(o.getAttribute("data-store"), { enabled: o.checked }, "Thip N."); toast(`${o.getAttribute("data-store")} schedule ${o.checked ? "enabled" : "paused"}`); DATA.pulse(); }
  });

  document.addEventListener("click", (e) => {
    const actEl = e.target.closest("[data-act]");
    if (actEl) {
      const act = actEl.getAttribute("data-act");
      if (act.startsWith("pick:")) { // composer chips: ch = multi, others = single
        const row = actEl.parentElement;
        if (act === "pick:ch") {
          actEl.setAttribute("aria-pressed", actEl.getAttribute("aria-pressed") !== "true");
        } else {
          row.querySelectorAll(".choice").forEach(c => c.setAttribute("aria-pressed", "false"));
          actEl.setAttribute("aria-pressed", "true");
        }
        return;
      }
      handleAct(act);
      return;
    }
    const goEl = e.target.closest("[data-go]");
    if (goEl) go(goEl.getAttribute("data-go"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const el = e.target.closest("[data-go]");
    if (el && !el.matches("button,a")) go(el.getAttribute("data-go"));
  });

  DATA.subscribe(render);
  window.addEventListener("hashchange", render);
  window.addEventListener("scroll", () => { document.body.dataset.scrolled = window.scrollY > 8; }, { passive: true });
  window.addEventListener("DOMContentLoaded", () => { if (!location.hash) location.hash = "#/launcher"; render(); });
})();
