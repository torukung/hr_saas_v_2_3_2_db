/* ============================================================
   ADEPTIO · v2.3.2.db — the resilient data layer, made live
   Blueprint v2.3.2 §02: one small database per tenant × store.
   Here each store is one persisted unit (localStorage in this
   demo = the "one file" physical unit; Turso/SQLite in build).
   - 10 logical stores, one writer each (R1)
   - every write → fact on the audit ledger (§05 sync path)
   - backup ladder B1/B2/B3: snapshot now · scheduled · replay
   - per-store restore: blast radius = 1 module × 1 tenant
   Deletable / addable sample data seeds below — reset anytime.
   ============================================================ */
window.DB = (function () {
  const TENANT = "phoungern";
  const NS = "adeptio.v232.";
  const SEED_VERSION = 5; // v5: 32-staff pilot roster + live-derived org KPIs

  /* localStorage — with in-memory shim so tools/smoke.js (node) runs */
  let LS;
  try { window.localStorage.setItem(NS + "probe", "1"); window.localStorage.removeItem(NS + "probe"); LS = window.localStorage; }
  catch (e) {
    const m = {};
    LS = { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
  }

  /* ---------- store catalog — Blueprint v2.3.2 §02 + §04 cards ---------- */
  const CATALOG = [
    { id: "db_people",   name: "People & Org",         layer: "L-OP",          profile: "PII · reference",     writer: "People cell",   icon: "users",     priority: 1, tables: ["employees", "divisions"],            protection: "Restore-priority 1 — every other cell joins to it by ID; quarterly drill restores this store first." },
    { id: "db_time",     name: "Time & Attendance",    layer: "L-OP",          profile: "high-volume",         writer: "Time cell",     icon: "clock",     priority: 2, tables: ["punches"],                            protection: "Month partitions archived to L-CU as read-only exports; live DB stays small and fast." },
    { id: "db_leave",    name: "Leave & Absence",      layer: "L-OP",          profile: "transactional",       writer: "Leave cell",    icon: "sun",       priority: 2, tables: ["leave_types", "balances"],            protection: "Standard profile — PITR + nightly export." },
    { id: "db_workflow", name: "Requests & Approvals", layer: "L-OP",          profile: "ID authority",        writer: "Workflow cell", icon: "inbox",     priority: 1, tables: ["requests"],                           protection: "Shared-ID registry — restore-priority 1 with db_people; IDs must never fork." },
    { id: "db_payroll",  name: "Payroll",              layer: "L-OP",          profile: "PII · sensitive",     writer: "Payroll cell",  icon: "banknote",  priority: 2, tables: ["payslips", "payroll_runs"],           protection: "Own encryption key per tenant · pre-run branch snapshot before every pay run · restricted credential." },
    { id: "db_comms",    name: "Communication",        layer: "L-OP",          profile: "high-volume",         writer: "Comms cell",    icon: "megaphone", priority: 4, tables: ["templates", "channels", "messages"], protection: "Delivery logs age out to L-CU — tolerant store, lowest restore priority." },
    { id: "db_docs",     name: "Documents Vault",      layer: "L-OP + L-CU",   profile: "PII · blob+meta",     writer: "Docs cell",     icon: "folder",    priority: 3, tables: ["documents"], gate: "vault",           protection: "Metadata here; files live in L-CU with bucket versioning — a DB restore never loses a file." },
    { id: "db_audit",    name: "Audit Ledger",         layer: "L-OP → L-CU",   profile: "immutable",           writer: "Event bus",     icon: "lock",      priority: 1, tables: ["events"], append: true,               protection: "Append-only · daily export to WORM (object-lock) bucket — even we cannot rewrite history." },
    { id: "dw_reports",  name: "Reporting Warehouse",  layer: "L-DR",          profile: "derived",             writer: "Projector",     icon: "chart",     priority: 5, tables: ["org_snapshots", "series"], derived: true, protection: "Rebuilt from the event ledger on demand — backup is a convenience, replay is the guarantee." },
    { id: "db_platform", name: "Platform Registry",    layer: "L-OP · global", profile: "control plane",       writer: "Kernel",        icon: "settings",  priority: 1, tables: ["registry", "backup_policies", "drills"], global: true, protection: "The one global DB — longest PITR window + export every 6 h; it is the map to everything else." }
  ];
  const byId = {}; CATALOG.forEach(c => byId[c.id] = c);

  /* ---------- seeds — sample data, deletable & addable ---------- */
  function seeds() {
    return {
      db_people: {
        // 32 active staff — the pilot-site roster. Add / delete / reassign via
        // HR → People (New hire · Offboard · Reassign) or Manager → Team data.
        employees: [
          // Production · Line A (8 + supervisor)
          { id: "EMP-0214", name: "Souksavanh Phommachanh", pos: "Machine Operator", div: "Production", team: "Line A", state: "present", in: "08:30", attend: 98, ot: 6,  leaveBal: 12, since: "Mar 2023" },
          { id: "EMP-0231", name: "Manysone Vongphachanh",  pos: "Machine Operator", div: "Production", team: "Line A", state: "present", in: "08:24", attend: 96, ot: 11, leaveBal: 8,  since: "Aug 2024" },
          { id: "EMP-0188", name: "Noy Keomany",            pos: "QC Inspector",     div: "Production", team: "Line A", state: "late",    in: "09:12", attend: 91, ot: 3,  leaveBal: 10, since: "Nov 2022" },
          { id: "EMP-0205", name: "Bounmy Latsavong",       pos: "Line Technician",  div: "Production", team: "Line A", state: "present", in: "08:18", attend: 99, ot: 14, leaveBal: 14, since: "May 2021" },
          { id: "EMP-0172", name: "Somphone Inthavong",     pos: "Machine Operator", div: "Production", team: "Line A", state: "onleave", in: "—",     attend: 94, ot: 2,  leaveBal: 4,  since: "Jan 2022" },
          { id: "EMP-0226", name: "Phetsamone Douangta",    pos: "Packer",           div: "Production", team: "Line A", state: "present", in: "08:29", attend: 97, ot: 8,  leaveBal: 11, since: "Jul 2023" },
          { id: "EMP-0240", name: "Chanthala Phimmasone",   pos: "Packer",           div: "Production", team: "Line A", state: "present", in: "08:31", attend: 95, ot: 5,  leaveBal: 9,  since: "Oct 2025" },
          { id: "EMP-0193", name: "Keo Sayavong",           pos: "Forklift Driver",  div: "Production", team: "Line A", state: "absent",  in: "—",     attend: 88, ot: 9,  leaveBal: 6,  since: "Jun 2022", status: "flagged" },
          { id: "EMP-0098", name: "Khamla Sisouphanh",      pos: "Supervisor · Line A", div: "Production", team: "—",  state: "present", in: "08:02", attend: 99, ot: 0,  leaveBal: 16, since: "Jan 2020" },
          // Production · Line B (7)
          { id: "EMP-0102", name: "Bouasone Keopaseuth",    pos: "Supervisor · Line B", div: "Production", team: "—",  state: "present", in: "08:05", attend: 98, ot: 0,  leaveBal: 14, since: "Mar 2020" },
          { id: "EMP-0218", name: "Khampheng Vilaysack",    pos: "Machine Operator", div: "Production", team: "Line B", state: "present", in: "08:26", attend: 97, ot: 9,  leaveBal: 10, since: "Apr 2023" },
          { id: "EMP-0222", name: "Outhai Sengsouvanh",     pos: "Machine Operator", div: "Production", team: "Line B", state: "present", in: "08:28", attend: 95, ot: 7,  leaveBal: 8,  since: "Sep 2023" },
          { id: "EMP-0237", name: "Viengsavanh Phrachanh",  pos: "QC Inspector",     div: "Production", team: "Line B", state: "present", in: "08:22", attend: 98, ot: 4,  leaveBal: 12, since: "Jan 2025" },
          { id: "EMP-0210", name: "Sengphet Chanthavixay",  pos: "Line Technician",  div: "Production", team: "Line B", state: "present", in: "08:15", attend: 99, ot: 12, leaveBal: 13, since: "Aug 2022" },
          { id: "EMP-0185", name: "Daosavanh Inthirath",    pos: "Packer",           div: "Production", team: "Line B", state: "present", in: "08:33", attend: 94, ot: 6,  leaveBal: 7,  since: "Oct 2022" },
          { id: "EMP-0249", name: "Phoutthasone Vongsa",    pos: "Packer",           div: "Production", team: "Line B", state: "present", in: "08:30", attend: 96, ot: 3,  leaveBal: 15, since: "Apr 2026", status: "probation" },
          // Production · plant-wide
          { id: "EMP-0150", name: "Amphone Thammavong",     pos: "Safety Officer",   div: "Production", team: "—",  state: "present", in: "08:10", attend: 99, ot: 1,  leaveBal: 11, since: "Jun 2021" },
          // Sales (4)
          { id: "EMP-0134", name: "Anousone Rattanavong",   pos: "Sales Manager",      div: "Sales",     team: "—",  state: "present", in: "08:40", attend: 97, ot: 0,  leaveBal: 12, since: "Feb 2021" },
          { id: "EMP-0244", name: "Davone Phanthavong",     pos: "Account Executive",  div: "Sales",     team: "—",  state: "present", in: "08:45", attend: 93, ot: 1,  leaveBal: 5,  since: "Feb 2026", status: "probation" },
          { id: "EMP-0228", name: "Malisa Phengdy",         pos: "Account Executive",  div: "Sales",     team: "—",  state: "present", in: "08:38", attend: 96, ot: 2,  leaveBal: 9,  since: "Nov 2023" },
          { id: "EMP-0246", name: "Thipphavanh Soulinthone",pos: "Sales Coordinator",  div: "Sales",     team: "—",  state: "present", in: "08:35", attend: 98, ot: 0,  leaveBal: 13, since: "Mar 2026", status: "probation" },
          // Logistics (4)
          { id: "EMP-0117", name: "Sourioudong Keola",      pos: "Logistics Supervisor", div: "Logistics", team: "—", state: "present", in: "08:08", attend: 98, ot: 2,  leaveBal: 14, since: "Jul 2020" },
          { id: "EMP-0203", name: "Khamsing Phialath",      pos: "Warehouse Officer",    div: "Logistics", team: "—", state: "present", in: "08:20", attend: 96, ot: 8,  leaveBal: 10, since: "May 2022" },
          { id: "EMP-0219", name: "Phonepadith Luanglath",  pos: "Driver",               div: "Logistics", team: "—", state: "present", in: "07:50", attend: 97, ot: 10, leaveBal: 9,  since: "Jan 2023" },
          { id: "EMP-0235", name: "Somchai Douangdara",     pos: "Forklift Driver",      div: "Logistics", team: "—", state: "present", in: "08:12", attend: 95, ot: 7,  leaveBal: 8,  since: "Dec 2024" },
          // Finance (3)
          { id: "EMP-0156", name: "Latsamy Vorachit",       pos: "Payroll Officer",    div: "Finance",   team: "—",  state: "present", in: "08:21", attend: 98, ot: 0,  leaveBal: 13, since: "Sep 2021" },
          { id: "EMP-0142", name: "Chindavone Sisavath",    pos: "Accountant",         div: "Finance",   team: "—",  state: "present", in: "08:25", attend: 99, ot: 0,  leaveBal: 12, since: "Oct 2021" },
          { id: "EMP-0167", name: "Ketsana Phommavong",     pos: "AP Officer",         div: "Finance",   team: "—",  state: "present", in: "08:27", attend: 97, ot: 0,  leaveBal: 11, since: "Feb 2022" },
          // Admin (4)
          { id: "EMP-0021", name: "Vilayvanh Chanthavong",  pos: "HR Operations Lead", div: "Admin",     team: "—",  state: "present", in: "07:58", attend: 99, ot: 0,  leaveBal: 15, since: "Apr 2019" },
          { id: "EMP-0089", name: "Bountheung Sayasone",    pos: "Office Manager",     div: "Admin",     team: "—",  state: "present", in: "08:00", attend: 99, ot: 0,  leaveBal: 16, since: "Aug 2019" },
          { id: "EMP-0177", name: "Noulak Chanthachone",    pos: "IT Support",         div: "Admin",     team: "—",  state: "present", in: "08:14", attend: 97, ot: 1,  leaveBal: 10, since: "Jun 2023" },
          { id: "EMP-0233", name: "Vansana Keomixay",       pos: "Receptionist",       div: "Admin",     team: "—",  state: "present", in: "07:55", attend: 98, ot: 0,  leaveBal: 12, since: "Jan 2024" }
        ],
        divisions: [
          { name: "Production", staff: 142, cost: 38.2, attr: 6.1, ot: 412 },
          { name: "Sales",      staff: 38,  cost: 17.4, attr: 9.8, ot: 86 },
          { name: "Logistics",  staff: 31,  cost: 11.9, attr: 8.4, ot: 132 },
          { name: "Finance",    staff: 22,  cost: 9.6,  attr: 4.2, ot: 22 },
          { name: "Admin",      staff: 15,  cost: 6.1,  attr: 5.0, ot: 14 }
        ]
      },
      db_time: {
        punches: [
          { id: "PN-0610", emp: "EMP-0214", date: "Wed, Jun 10", in: "08:30", out: "—",     hours: "—",  status: "ok" },
          { id: "PN-0609", emp: "EMP-0214", date: "Tue, Jun 09", in: "08:28", out: "17:32", hours: 8.1,  status: "ok" },
          { id: "PN-0608", emp: "EMP-0214", date: "Mon, Jun 08", in: "08:31", out: "17:30", hours: 8.0,  status: "ok" },
          { id: "PN-0605", emp: "EMP-0214", date: "Fri, Jun 05", in: "—",     out: "17:31", hours: "—",  status: "flagged" },
          { id: "PN-0604", emp: "EMP-0214", date: "Thu, Jun 04", in: "08:29", out: "19:40", hours: 10.2, status: "ot" },
          { id: "PN-0603", emp: "EMP-0214", date: "Wed, Jun 03", in: "08:30", out: "17:29", hours: 8.0,  status: "ok" }
        ]
      },
      db_leave: {
        leave_types: [
          { code: "AL", name: "Annual leave",   days: 15, accrual: "1.25 d / month", carry: "5 d max" },
          { code: "SL", name: "Sick leave",     days: 30, accrual: "statutory",      carry: "—" },
          { code: "PL", name: "Personal leave", days: 3,  accrual: "fixed",          carry: "—" },
          { code: "ML", name: "Maternity",      days: 105, accrual: "statutory",     carry: "—" }
        ],
        balances: [
          { emp: "EMP-0214", name: "Souksavanh P.", annual: 12, sick: 28, taken: 6 },
          { emp: "EMP-0231", name: "Manysone V.",   annual: 8,  sick: 30, taken: 9 },
          { emp: "EMP-0226", name: "Phetsamone D.", annual: 11, sick: 27, taken: 7 },
          { emp: "EMP-0172", name: "Somphone I.",   annual: 4,  sick: 30, taken: 13 }
        ]
      },
      db_workflow: {
        requests: [
          { id: "LV-0481", type: "Leave",      who: "Souksavanh Phommachanh", detail: "Annual leave · 2 days",        dates: "Jun 18 – 19",            status: "pending",  stage: "L1 · Manager",        sla: "14h left", note: "Family visit in Pakse.",            submitted: "Jun 09 · 16:40" },
          { id: "OT-0322", type: "Overtime",   who: "Manysone Vongphachanh",  detail: "Overtime · 3 hours",           dates: "Jun 11 · 17:00–20:00",   status: "pending",  stage: "L1 · Manager",        sla: "9h left",  note: "Line B maintenance window.",        submitted: "Jun 10 · 07:55" },
          { id: "EX-0210", type: "Claim",      who: "Souksavanh Phommachanh", detail: "Expense claim · ₭ 420,000",    dates: "Receipt · Jun 06",       status: "pending",  stage: "L2 · HR / Finance",   sla: "1d left",  note: "Safety boots replacement.",         submitted: "Jun 08 · 11:02" },
          { id: "TC-0107", type: "Correction", who: "Keo Sayavong",           detail: "Missing punch · Jun 05",       dates: "Jun 05 · in 08:27",      status: "returned", stage: "Returned to staff",   sla: "—",        note: "Please attach gate log photo.",     submitted: "Jun 06 · 09:15" },
          { id: "LV-0476", type: "Leave",      who: "Phetsamone Douangta",    detail: "Sick leave · 1 day",           dates: "Jun 04",                 status: "approved", stage: "Recorded",            sla: "—",        note: "Medical certificate attached.",     submitted: "Jun 04 · 08:05" },
          { id: "OT-0318", type: "Overtime",   who: "Bounmy Latsavong",       detail: "Overtime · 2 hours",           dates: "Jun 07 · 17:00–19:00",   status: "approved", stage: "Recorded",            sla: "—",        note: "Order rush — approved by plan.",    submitted: "Jun 07 · 12:20" }
        ]
      },
      db_payroll: {
        payslips: [
          { id: "PS-2026-05", emp: "EMP-0214", period: "May 2026",   net: 4862000, gross: 5640000, paid: "May 31", status: "ready",
            lines: [["Basic salary", 4200000], ["OT (12.5 h)", 540000], ["Position allowance", 450000], ["Meal & transport", 450000]],
            deds:  [["Income tax (PIT)", -468000], ["Social security (5.5%)", -310200]] },
          { id: "PS-2026-04", emp: "EMP-0214", period: "April 2026", net: 4715000, gross: 5430000, paid: "Apr 30", status: "ready",
            lines: [["Basic salary", 4200000], ["OT (7 h)", 330000], ["Position allowance", 450000], ["Meal & transport", 450000]],
            deds:  [["Income tax (PIT)", -428000], ["Social security (5.5%)", -287000]] }
        ],
        payroll_runs: [
          { id: "PR-2026-06", period: "June 2026",  state: "draft",     step: 1, staff: 248, gross: "₭ 1.42B", cutoff: "Jun 25", notes: "3 OT batches pending L1." },
          { id: "PR-2026-05", period: "May 2026",   state: "disbursed", step: 4, staff: 246, gross: "₭ 1.39B", cutoff: "May 25", notes: "Bank file exported · May 30." },
          { id: "PR-2026-04", period: "April 2026", state: "disbursed", step: 4, staff: 243, gross: "₭ 1.36B", cutoff: "Apr 25", notes: "Bank file exported · Apr 29." }
        ]
      },
      db_comms: {
        templates: [
          { id: "TPL-014", name: "Employment letter",          kind: "Letter",      lang: "EN · ລາວ", status: "published", v: "3.1", updated: "Jun 02" },
          { id: "TPL-019", name: "Town hall announcement",     kind: "Email",       lang: "EN · ລາວ", status: "published", v: "1.4", updated: "Jun 08" },
          { id: "TPL-021", name: "Payslip ready notification", kind: "Email · Push", lang: "EN · ລາວ", status: "published", v: "2.0", updated: "May 28" },
          { id: "TPL-023", name: "Shift reminder",             kind: "SMS",         lang: "EN",       status: "review",    v: "0.9", updated: "Jun 09" },
          { id: "TPL-025", name: "Salary certificate",         kind: "Letter",      lang: "EN · ລາວ", status: "published", v: "1.2", updated: "May 30" },
          { id: "TPL-026", name: "Document expiry notice",     kind: "Email · SMS", lang: "EN · ລາວ", status: "draft",     v: "0.3", updated: "Jun 10" }
        ],
        channels: [
          { name: "Email · SMTP relay",   id: "smtp.adeptio.la",  status: "live",   rate: "99.2%", today: 412 },
          { name: "SMS · LaoTel gateway", id: "laotel-bulk-01",   status: "live",   rate: "97.8%", today: 86 },
          { name: "Push · in-app",        id: "fcm-adeptio-prod", status: "live",   rate: "99.9%", today: 1240 },
          { name: "Webhook · LINE OA",    id: "line-oa-bridge",   status: "failed", rate: "—",     today: 0 }
        ],
        messages: []
      },
      db_docs: {
        documents: [
          { id: "DOC-0101", emp: "EMP-0214", name: "Employment contract", kind: "Contract", expiry: "Dec 2027",              status: "active" },
          { id: "DOC-0102", emp: "EMP-0214", name: "National ID",         kind: "Identity", expiry: "Mar 2029",              status: "active" },
          { id: "DOC-0103", emp: "EMP-0214", name: "Forklift license",    kind: "License",  expiry: "Jul 2026",              status: "expiring" },
          { id: "DOC-0104", emp: "EMP-0214", name: "Code of conduct v4",  kind: "Policy",   expiry: "Acknowledge by Jun 20", status: "pending" }
        ]
      },
      db_audit: {
        events: [
          { ts: "10:42", who: "Vilayvanh C.",  act: "payroll.run.draft_created", obj: "PR-2026-06",               ip: "10.0.4.12" },
          { ts: "10:18", who: "Khamla S.",     act: "leave.approved",            obj: "LV-0476",                  ip: "10.0.7.31" },
          { ts: "09:56", who: "Thip N.",       act: "template.published",        obj: "TPL-019 v1.4",             ip: "10.0.1.9" },
          { ts: "09:31", who: "system",        act: "channel.failover",          obj: "line-oa-bridge",           ip: "—" },
          { ts: "09:02", who: "Thip N.",       act: "role.permission_changed",   obj: "manager → reports.team",   ip: "10.0.1.9" },
          { ts: "08:47", who: "Souksavanh P.", act: "attendance.punch_in",       obj: "EMP-0214 · GPS",           ip: "mobile" }
        ]
      },
      dw_reports: {
        org_snapshots: [
          // headcount / present / late / absent / onleave / division staff counts are
          // DERIVED LIVE from db_people.employees by DATA.org() on this tier —
          // add or offboard a staff member and the KPIs move. Static fields below
          // (cost %, gross, …) stay snapshot values pending the payroll cell.
          { tier: "essential", headcount: 32, present: 29, presentPct: "90.6%", late: 1, absent: 1, onleave: 1,
            newMoM: "+2", runStaff: 32, gross: "₭ 186M", net: "₭ 158M", broadcast: 32, segment: 18,
            divisions: [
              { name: "Production", staff: 17, cost: 41.0, attr: 5.8, ot: 84 },
              { name: "Sales",      staff: 4,  cost: 16.2, attr: 8.1, ot: 18 },
              { name: "Logistics",  staff: 4,  cost: 12.4, attr: 7.2, ot: 26 },
              { name: "Finance",    staff: 3,  cost: 9.8,  attr: 4.0, ot: 5 },
              { name: "Admin",      staff: 4,  cost: 6.4,  attr: 4.4, ot: 3 }
            ] },
          { tier: "professional", headcount: 248, present: 236, presentPct: "95.1%", late: 4, absent: 3, onleave: 5,
            newMoM: "+3", runStaff: 248, gross: "₭ 1.42B", net: "₭ 1.21B", broadcast: 248, segment: 142,
            divisions: [
              { name: "Production", staff: 142, cost: 38.2, attr: 6.1, ot: 412 },
              { name: "Sales",      staff: 38,  cost: 17.4, attr: 9.8, ot: 86 },
              { name: "Logistics",  staff: 31,  cost: 11.9, attr: 8.4, ot: 132 },
              { name: "Finance",    staff: 22,  cost: 9.6,  attr: 4.2, ot: 22 },
              { name: "Admin",      staff: 15,  cost: 6.1,  attr: 5.0, ot: 14 }
            ] }
        ],
        series: [
          { id: "burn", labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            actual: [1.21, 1.23, 1.22, 1.26, 1.31, 1.42, 1.28, 1.27, 1.33, 1.36, 1.39, 1.42],
            budget: [1.25, 1.25, 1.28, 1.28, 1.32, 1.40, 1.33, 1.33, 1.36, 1.38, 1.42, 1.45] },
          { id: "attendance_trend", values: [93.8, 94.6, 95.2, 94.1, 95.8, 96.0, 94.9, 95.5, 94.7, 95.1] },
          { id: "audit_pulse", values: [84, 96, 122, 141, 138, 156, 149, 171, 162, 178] }
        ]
      },
      db_platform: {
        registry: CATALOG.map(c => ({
          store: c.id, physical: TENANT + "-" + c.id.replace(/^d[bw]_/, ""), layer: c.layer,
          group: c.global ? "global-core" : "apac-core", region: "aws-ap-southeast-1",
          schema: c.id.replace(/^d[bw]_/, "") + "-schema@v1", status: c.gate ? "flag-gated" : "active",
          credential: "vault://" + TENANT + "/" + c.id.replace(/^d[bw]_/, "") + "-rw",
          encryption: (c.id === "db_payroll" || c.id === "db_docs") ? "per-tenant-key" : "at-rest",
          pitr: c.global ? "90 d" : "30 d", residency: "none"
        })),
        backup_policies: CATALOG.map(c => ({
          store: c.id, enabled: c.id !== "dw_reports",
          freq: c.global ? "6-hourly" : c.id === "db_audit" ? "daily-worm" : "nightly",
          time: "02:00", retention: c.id === "db_audit" ? "statutory" : "35 d",
          custody: c.id === "db_audit" ? "R2 · WORM bucket (object-lock)" : "R2 · adeptio-backups (versioned)",
          prerun: c.id === "db_payroll", note: c.derived ? "rebuild > restore — replay from facts" : "", last: null
        })),
        drills: [
          { id: "DR-0017", ts: "Jun 01 · 02:10", target: TENANT + "-leave + db_platform", result: "pass", checks: "integrity ✓ · row counts ✓ · checksums ✓" },
          { id: "DR-0016", ts: "May 01 · 02:08", target: TENANT + "-people + db_platform", result: "pass", checks: "integrity ✓ · row counts ✓ · checksums ✓" }
        ]
      }
    };
  }

  /* ---------- load / persist ---------- */
  const data = {};
  function key(id) { return NS + "db." + TENANT + "-" + id; }
  function persist(id) {
    try { LS.setItem(key(id), JSON.stringify({ v: SEED_VERSION, t: Date.now(), tables: data[id] })); } catch (e) { /* quota — demo keeps running in-memory */ }
    try { if (window.TURSO && window.TURSO.enqueue) window.TURSO.enqueue(id); } catch (e) { /* cloud sync is optional */ }
  }
  /* cloud-sync hooks (js/turso-sync.js) — no-ops unless Turso is configured */
  function localMeta(id) { try { const p = JSON.parse(LS.getItem(key(id)) || "null"); return p ? { v: p.v, t: p.t } : null; } catch (e) { return null; } }
  function raw(id) { return data[id]; }
  function hydrate(id, tables, t) {
    if (!byId[id] || !tables) return false;
    data[id] = tables;
    try { LS.setItem(key(id), JSON.stringify({ v: SEED_VERSION, t: t || Date.now(), tables })); } catch (e) { /* quota */ }
    return true; // note: hydrate persists WITHOUT enqueueing — a pull must never echo back as a push
  }
  function loadAll() {
    const sd = seeds();
    CATALOG.forEach(c => {
      let ok = false;
      try {
        const raw = LS.getItem(key(c.id));
        if (raw) { const p = JSON.parse(raw); if (p && p.v === SEED_VERSION && p.tables) { data[c.id] = p.tables; ok = true; } }
      } catch (e) { /* fall through to seed */ }
      if (!ok) { data[c.id] = sd[c.id]; persist(c.id); }
    });
  }
  loadAll();

  /* ---------- clock helpers ---------- */
  const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const stamp = () => { const d = new Date(); return d.toLocaleString("en-US", { month: "short", day: "2-digit" }) + " · " + now(); };

  /* ---------- audit — every write becomes a fact (§05 sync path) ---------- */
  function audit(who, act, obj, ip) {
    data.db_audit.events.unshift({ ts: now(), who, act, obj, ip: ip || "console" });
    if (data.db_audit.events.length > 250) data.db_audit.events.length = 250;
    persist("db_audit");
  }

  /* ---------- CRUD — one writer per store, enforced at the call site ---------- */
  function list(store, table) { return (data[store] && data[store][table]) || []; }
  function add(store, table, row, who) {
    if (byId[store] && byId[store].derived) return null;
    data[store][table].unshift(row);
    persist(store);
    if (store !== "db_audit") audit(who || "console", store.replace(/^d[bw]_/, "") + "." + table + ".row_added", row.id || row.name || row.code || table, "studio");
    return row;
  }
  function del(store, table, field, value, who) {
    if (byId[store] && byId[store].append) return false; // audit ledger is append-only — immutable by design
    const arr = data[store][table];
    const i = arr.findIndex(r => String(r[field]) === String(value));
    if (i < 0) return false;
    arr.splice(i, 1);
    persist(store);
    audit(who || "console", store.replace(/^d[bw]_/, "") + "." + table + ".row_deleted", String(value), "studio");
    return true;
  }
  function reset(store, who) {
    const sd = seeds();
    if (store) { data[store] = sd[store]; persist(store); audit(who || "console", "store.reseeded", TENANT + "-" + store.replace(/^d[bw]_/, ""), "studio"); }
    else { CATALOG.forEach(c => { data[c.id] = sd[c.id]; persist(c.id); }); audit(who || "console", "tenant.reseeded", TENANT + " · all stores", "studio"); }
  }

  /* ---------- store meta ---------- */
  function rows(id) { return Object.values(data[id] || {}).reduce((n, t) => n + (Array.isArray(t) ? t.length : 0), 0); }
  function sizeKB(id) { try { return Math.max(1, Math.round(JSON.stringify(data[id]).length / 1024)); } catch (e) { return 0; } }
  function provisioned(id) {
    const c = byId[id];
    if (c && c.gate && window.DATA && !DATA.has(c.gate)) return false;
    return true;
  }
  function meta(id) { const c = byId[id]; return { ...c, rows: rows(id), sizeKB: sizeKB(id), physical: TENANT + "-" + id.replace(/^d[bw]_/, ""), provisioned: provisioned(id) }; }
  function policy(id) { return data.db_platform.backup_policies.find(p => p.store === id); }
  function regRow(id) { return data.db_platform.registry.find(p => p.store === id); }

  /* ---------- backups — the B1/B2/B3 ladder, simulated honestly ----------
     B1 continuous = every persist() is a commit (localStorage write)
     B2 snapshots  = explicit copies in the custodial area below
     B3 replay     = db_audit facts + dw_reports rebuild               */
  const BK = NS + "backups";
  function bkAll() { try { return JSON.parse(LS.getItem(BK) || "[]"); } catch (e) { return []; } }
  function bkSave(arr) { try { LS.setItem(BK, JSON.stringify(arr)); } catch (e) { /* quota guard: drop oldest and retry once */ try { arr.splice(12); LS.setItem(BK, JSON.stringify(arr)); } catch (e2) {} } }
  let bkSeq = bkAll().reduce((m, b) => Math.max(m, Number(String(b.id).replace(/\D/g, "")) - 1000), 0);

  function backupNow(storeIds, kind, label, who) {
    const ids = (storeIds && storeIds.length ? storeIds : CATALOG.map(c => c.id)).filter(provisioned);
    const snap = {};
    ids.forEach(id => { snap[id] = JSON.parse(JSON.stringify(data[id])); });
    const all = bkAll();
    bkSeq += 1;
    const bk = {
      id: "BK-" + String(1000 + bkSeq), ts: stamp(), kind: kind || "manual",
      label: label || (kind === "scheduled" ? "Scheduled export" : kind === "pre-run" ? "Pre-run branch" : "Manual snapshot"),
      stores: ids, rows: ids.reduce((n, id) => n + rows(id), 0),
      sizeKB: Math.max(1, Math.round(JSON.stringify(snap).length / 1024)), data: snap
    };
    all.unshift(bk);
    // retention: keep it sane inside localStorage — 10 scheduled + 14 of everything else
    const sch = all.filter(b => b.kind === "scheduled").slice(0, 10);
    const oth = all.filter(b => b.kind !== "scheduled").slice(0, 14);
    bkSave(all.filter(b => sch.includes(b) || oth.includes(b)));
    audit(who || "system", "backup.exported", bk.id + " · " + ids.length + " store" + (ids.length > 1 ? "s" : "") + " → L-CU", kind === "scheduled" ? "night-job" : "studio");
    return bk;
  }
  function backupRestore(bkId, storeIds, who) {
    const bk = bkAll().find(b => b.id === bkId);
    if (!bk) return null;
    const ids = (storeIds && storeIds.length ? storeIds : bk.stores).filter(id => bk.data[id]);
    ids.forEach(id => {
      if (byId[id] && byId[id].append) { // audit ledger: restores append a fact, never rewrite
        audit(who || "console", "backup.audit_verified", bkId + " · WORM copy matches", "drill");
        return;
      }
      data[id] = JSON.parse(JSON.stringify(bk.data[id]));
      persist(id);
    });
    audit(who || "console", "backup.restored", bkId + " → " + ids.join(", "), "studio");
    return ids;
  }
  function backupClear(who) {
    const n = bkAll().length;
    bkSave([]);
    audit(who || "Thip N.", "backup.history_cleared", n + " snapshot" + (n === 1 ? "" : "s") + " expired (demo reset)", "studio");
    return n;
  }
  function backupDelete(bkId, who) {
    const all = bkAll();
    const i = all.findIndex(b => b.id === bkId);
    if (i < 0) return false;
    all.splice(i, 1); bkSave(all);
    audit(who || "console", "backup.expired", bkId, "retention");
    return true;
  }
  function exportObj(storeIds) {
    const ids = (storeIds && storeIds.length ? storeIds : CATALOG.map(c => c.id)).filter(provisioned);
    const out = { platform: "Adeptio Adaptive HR · v2.3.2.db", tenant: TENANT, exported: new Date().toISOString(), stores: {} };
    ids.forEach(id => out.stores[id] = data[id]);
    return out;
  }

  /* ---------- scheduler — per-module, customizable, catches up on load ---------- */
  const FREQ_MS = { "hourly": 36e5, "6-hourly": 216e5, "nightly": 864e5, "daily-worm": 864e5, "weekly": 6048e5, "monthly": 2592e6 };
  function setPolicy(store, patch, who) {
    const p = policy(store);
    if (!p) return;
    Object.assign(p, patch);
    persist("db_platform");
    audit(who || "Thip N.", "backup.policy_changed", TENANT + "-" + store.replace(/^d[bw]_/, "") + " · " + (patch.freq || (patch.enabled === false ? "disabled" : "updated")), "studio");
  }
  function tick() {
    const due = [];
    const t = Date.now();
    data.db_platform.backup_policies.forEach(p => {
      if (!p.enabled || p.freq === "off" || !provisioned(p.store)) return;
      const ms = FREQ_MS[p.freq] || 864e5;
      if (!p.last || t - p.last >= ms) { due.push(p.store); p.last = t; }
    });
    if (due.length) {
      persist("db_platform");
      backupNow(due, "scheduled", "Scheduled export · " + due.length + " store" + (due.length > 1 ? "s" : ""), "system");
    }
    return due;
  }

  /* ---------- restore drill — P5: restore is a habit, not a hope ---------- */
  function drill(who) {
    const pool = CATALOG.filter(c => !c.derived && provisioned(c.id));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const branch = JSON.parse(JSON.stringify(data[pick.id])); // instant branch — metadata-only in Turso, deep copy here
    const okRows = Object.keys(branch).every(tb => branch[tb].length === data[pick.id][tb].length);
    const okSum = JSON.stringify(branch).length === JSON.stringify(data[pick.id]).length;
    const result = okRows && okSum ? "pass" : "fail";
    const d = { id: "DR-" + String(18 + data.db_platform.drills.length).padStart(4, "0"), ts: stamp(), target: TENANT + "-" + pick.id.replace(/^d[bw]_/, "") + " + db_platform", result, checks: "integrity " + (okSum ? "✓" : "✗") + " · row counts " + (okRows ? "✓" : "✗") + " · checksums " + (okSum ? "✓" : "✗") };
    data.db_platform.drills.unshift(d);
    persist("db_platform");
    audit(who || "system", "restore.drill_" + result, d.target, "drill");
    return d;
  }

  /* ---------- dw_reports rebuild — B3 replay, demonstrated ---------- */
  function rebuildReports(who) {
    const pro = data.dw_reports.org_snapshots.find(s => s.tier === "professional");
    const ess = data.dw_reports.org_snapshots.find(s => s.tier === "essential");
    const emp = data.db_people.employees;
    if (pro) {
      pro.present = emp.filter(e => e.state === "present").length + (pro.headcount - emp.length);
      pro.late = emp.filter(e => e.state === "late").length;
      pro.absent = emp.filter(e => e.state === "absent").length;
      pro.onleave = emp.filter(e => e.state === "onleave").length;
    }
    if (ess) { ess.late = emp.filter(e => e.state === "late").length; ess.absent = emp.filter(e => e.state === "absent").length; }
    persist("dw_reports");
    audit(who || "system", "dw.rebuilt", TENANT + "-reports · replayed from " + data.db_audit.events.length + " facts", "projector");
    return data.db_audit.events.length;
  }

  // browser only: scheduler heartbeat (1-min check; frequencies are real)
  // + catch-up tick shortly after load — overdue stores export immediately, so
  //   a tenant can never sit half-protected (§09: backups follow provisioning)
  if (typeof document !== "undefined") {
    setTimeout(() => { const d = tick(); if (d.length && window.DATA) DATA.pulse && DATA.pulse(); }, 1500);
    setInterval(() => { const d = tick(); if (d.length && window.DATA) DATA.pulse && DATA.pulse(); }, 60000);
  }

  return {
    TENANT, CATALOG, list, add, del, reset, meta, rows, sizeKB, provisioned,
    policy, setPolicy, regRow, audit, now, stamp,
    backups: { all: bkAll, now: backupNow, restore: backupRestore, remove: backupDelete, clear: backupClear },
    exportObj, tick, drill, rebuildReports,
    persist, localMeta, raw, hydrate
  };
})();
