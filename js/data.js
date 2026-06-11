/* ============================================================
   ADEPTIO · v2.3.2.db — DATA, now a thin lens over window.DB
   v2.3.1 shipped this file as an in-memory demo store; v2.3.2.db
   replaces the arrays with live reads from the split data layer
   (js/db.js). Same public surface — screens did not change their
   contract — but every collection is now persisted per store,
   every mutation lands in exactly one store and becomes a fact
   on db_audit (§05 sync path). Both tiers run on the same DB.
   ============================================================ */
window.DATA = (function () {

  const company = {
    name: "Phou Ngern Group",
    tier: "Professional · ≤250 seats",
    headcount: 248,
    presentPct: 95.1,
    get divisions() { return DB.list("db_people", "divisions"); }
  };

  // Who you are, per persona lens
  const me = {
    staff:    { name: "Souksavanh Phommachanh", id: "EMP-0214", role: "Machine Operator · Production Line A", site: "Vientiane Plant 1" },
    manager:  { name: "Khamla Sisouphanh",      id: "EMP-0098", role: "Supervisor · Production Line A", team: "Production Line A" },
    hr:       { name: "Vilayvanh Chanthavong",  id: "EMP-0021", role: "HR Operations Lead" },
    ceo:      { name: "Phonesavanh Luangrath",  id: "EMP-0001", role: "Chief Executive · Shareholder" },
    sysadmin: { name: "Thip Norasing",          id: "ADM-0002", role: "Platform Administrator" }
  };

  /* ---------- live state (UI-session state; records live in DB) ---------- */
  const state = {
    clockedIn: true, clockIn: "08:30",
    lang: "en",
    get sent() { return DB.list("db_comms", "messages"); }, // comms log lives in db_comms now
    // Tier flag — R4 "flags, not forks": one codebase, gated per tier.
    tier: (typeof location !== "undefined" && /tier=professional/.test(location.search)) ? "professional" : "essential"
  };

  /* ---------- tier gates (Blueprint §13 — unlocks-at) ---------- */
  const GATES = {
    deviceCapture: "growth", l2: "growth", vault: "growth", broadcastEmail: "growth",
    scheduledReports: "growth", docRequests: "growth", fullMss: "growth",
    ceo: "professional", sysadmin: "professional", sms: "professional",
    segmentation: "professional", delegation: "professional", analytics: "professional",
    bulkDocs: "professional", execPack: "professional", customCms: "professional",
    webhook: "enterprise", esign: "enterprise", sso: "enterprise"
  };
  const TIER_LABELS = { growth: "Growth · ≤100", professional: "Professional · ≤250", enterprise: "Enterprise · ≤600" };
  function has(flag) {
    const gate = GATES[flag];
    if (!gate) return true;
    if (state.tier === "professional") return gate !== "enterprise";
    return false; // essential: every gated flag is locked
  }
  const unlockLabel = (flag) => TIER_LABELS[GATES[flag]] || "Growth · ≤100";
  function setTier(t) {
    state.tier = t;
    DB.audit("system", "tenant.tier_flag", t + " (preview)", "—");
    notify();
  }

  /* ---------- tier-aware org numbers — read from dw_reports (L-DR) ----------
     On Essential (the pilot site = the actual db_people roster) the head-
     count, presence and division staff numbers are DERIVED LIVE from the
     employees table — hire or offboard someone and every KPI moves.
     Pro keeps the 248-org snapshot (directory shows the pilot sample). */
  function org() {
    const snaps = DB.list("dw_reports", "org_snapshots");
    const snap = snaps.find(s => s.tier === state.tier) || snaps[0];
    if (!snap || state.tier !== "essential") return snap;
    const emp = DB.list("db_people", "employees");
    const c = (st) => emp.filter(e => e.state === st).length;
    const present = c("present");
    return {
      ...snap,
      headcount: emp.length, present, late: c("late"), absent: c("absent"), onleave: c("onleave"),
      presentPct: emp.length ? (Math.round(present / emp.length * 1000) / 10).toFixed(1) + "%" : "—",
      runStaff: emp.length, broadcast: emp.length,
      divisions: snap.divisions.map(d => ({ ...d, staff: emp.filter(e => e.div === d.name).length }))
    };
  }
  const series = (id) => DB.list("dw_reports", "series").find(s => s.id === id) || { values: [0], labels: [], actual: [0], budget: [0] };

  /* ---------- tiny pub/sub ---------- */
  const subs = [];
  function notify() { subs.forEach(fn => fn()); }

  /* ---------- ledger mutations — each writes exactly ONE store (R1) ---------- */
  function approve(id) {
    const r = DB.list("db_workflow", "requests").find(x => x.id === id);
    if (!r) return;
    if (r.stage.startsWith("L1") && r.type === "Claim" && has("l2")) {
      r.stage = "L2 · HR / Finance"; // multi-step chain (Growth+)
    } else {
      r.status = "approved"; r.stage = "Recorded"; r.sla = "—"; // single-step on Essential
    }
    DB.persist("db_workflow");
    DB.audit("Khamla S.", r.type.toLowerCase() + ".approved", r.id, "10.0.7.31");
    notify();
  }
  function ret(id) {
    const r = DB.list("db_workflow", "requests").find(x => x.id === id);
    if (!r) return;
    r.status = "returned"; r.stage = "Returned to staff"; r.sla = "—";
    DB.persist("db_workflow");
    DB.audit("Khamla S.", r.type.toLowerCase() + ".returned", r.id, "10.0.7.31");
    notify();
  }
  function clock() {
    state.clockedIn = !state.clockedIn;
    const punches = DB.list("db_time", "punches");
    if (state.clockedIn) {
      state.clockIn = DB.now();
      DB.add("db_time", "punches", { id: "PN-" + Date.now().toString().slice(-4), emp: me.staff.id, date: "Wed, Jun 10", in: state.clockIn, out: "—", hours: "—", status: "ok" }, "Souksavanh P.");
    } else {
      const open = punches.find(p => p.emp === me.staff.id && p.out === "—");
      if (open) { open.out = DB.now(); DB.persist("db_time"); }
    }
    DB.audit("Souksavanh P.", state.clockedIn ? "attendance.punch_in" : "attendance.punch_out", me.staff.id + " · GPS", "mobile");
    notify();
  }
  function submitRequest(type, detail) {
    const prefix = { Leave: "LV", Overtime: "OT", Claim: "EX", Correction: "TC" }[type] || "RQ";
    const id = prefix + "-0" + (483 + DB.list("db_workflow", "requests").length);
    DB.add("db_workflow", "requests", { id, type, who: me.staff.name, detail, dates: "Jun 2026", status: "pending", stage: "L1 · Manager", sla: "48h", note: "Submitted from UI preview.", submitted: "Jun 10 · " + DB.now() }, "Souksavanh P.");
    notify();
    return id;
  }
  function advanceRun(id) {
    const r = DB.list("db_payroll", "payroll_runs").find(x => x.id === id);
    if (!r || r.step >= 4) return;
    if (r.step === 2 && DB.policy("db_payroll") && DB.policy("db_payroll").prerun) {
      // §06 — payroll's extra belt: branch before money moves
      DB.backups.now(["db_payroll"], "pre-run", "Pre-run branch · " + r.id, "kernel");
    }
    r.step += 1;
    r.state = ["draft", "draft", "review", "approved", "disbursed"][r.step];
    DB.persist("db_payroll");
    DB.audit("Vilayvanh C.", "payroll.run." + r.state, r.id, "10.0.4.12");
    notify();
  }
  function sendComms(audience, channelsList, est) {
    DB.add("db_comms", "messages", { id: "MSG-0" + (88 + DB.list("db_comms", "messages").length), audience, ch: channelsList.join(" · "), est, ts: DB.now() }, "Vilayvanh C.");
    notify();
  }

  // On Essential (no L2), items staged for HR/Finance fall back to the manager's single-step queue
  const pendingL1 = () => DB.list("db_workflow", "requests").filter(r => r.status === "pending" && (r.stage.startsWith("L1") || (!has("l2") && r.stage.startsWith("L2"))));
  const pendingL2 = () => DB.list("db_workflow", "requests").filter(r => r.status === "pending" && r.stage.startsWith("L2"));
  const mine = () => DB.list("db_workflow", "requests").filter(r => r.who === me.staff.name);

  return {
    company, me, state,
    // collections — live views over the split stores (one writer each)
    get team()        { return DB.list("db_people", "employees").filter(e => e.team === "Line A"); },
    get employees()   { return DB.list("db_people", "employees"); },
    get requests()    { return DB.list("db_workflow", "requests"); },
    get payslips()    { return DB.list("db_payroll", "payslips"); },
    get payrollRuns() { return DB.list("db_payroll", "payroll_runs"); },
    get templates()   { return DB.list("db_comms", "templates"); },
    get channels()    { return DB.list("db_comms", "channels"); },
    get audit()       { return DB.list("db_audit", "events"); },
    get docs()        { return DB.list("db_docs", "documents"); },
    get burn()              { return series("burn"); },
    get attendanceTrend()   { return series("attendance_trend").values; },
    get sent()              { return DB.list("db_comms", "messages"); },
    approve, ret, clock, submitRequest, advanceRun, sendComms,
    pendingL1, pendingL2, mine,
    has, unlockLabel, setTier, org,
    tier: () => state.tier,
    pulse: notify,
    subscribe(fn) { subs.push(fn); }
  };
})();
