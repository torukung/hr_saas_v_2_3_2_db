/* Structural smoke test — renders every screen (web+mobile, all personas)
   without a browser and validates routing integrity. */
const fs = require("fs"), path = require("path");
const ROOT = process.argv[2];

global.window = global;
const code = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
eval(code("js/i18n.js"));
eval(code("js/ui.js"));
eval(code("js/db.js"));      // v2.3.2.db — the split data layer (in-memory shim in node)
eval(code("js/data.js"));
eval(code("js/screens/dbviews.js"));
for (const f of ["staff", "manager", "hr", "ceo", "sysadmin"]) eval(code("js/screens/" + f + ".js"));

const errors = [], warns = [];
const params = {
  "request-detail": "LV-0481", "payslip": "PS-2026-05", "request-new": "Claim",
  "approval": "EX-0210", "member": "EMP-0214", "person": "EMP-0214",
  "payroll-run": "PR-2026-06", "division": "Sales", "template": "TPL-023",
  "dbstore": "db_people", "data": "db_people"
};
const screens = {}; // collect existing screen ids per persona/device

for (const [pk, P] of Object.entries(PERSONAS)) {
  screens[pk] = { web: new Set(Object.keys(P.web)), mobile: new Set(Object.keys(P.mobile)) };
}

let rendered = 0;
const allBodies = [];
for (const tier of ["essential", "professional"]) { // v2.3.1.essential — render every screen under both tier flags
  DATA.state.tier = tier;
  for (const [pk, P] of Object.entries(PERSONAS)) {
    for (const dev of ["web", "mobile"]) {
      for (const [sid, fn] of Object.entries(P[dev])) {
        try {
          const out = fn(params[sid]);
          if (!out || typeof out.body !== "string" || !out.body.length) { errors.push(`[${tier}] ${pk}/${dev}/${sid}: empty body`); continue; }
          if (dev === "web" && !out.title) errors.push(`[${tier}] ${pk}/${dev}/${sid}: missing title`);
          for (const bad of ["undefined", "[object Object]", "NaN"]) {
            if (out.body.includes(bad)) errors.push(`[${tier}] ${pk}/${dev}/${sid}: contains "${bad}"`);
            if (out.title && String(out.title).includes(bad)) errors.push(`[${tier}] ${pk}/${dev}/${sid}: title contains "${bad}"`);
          }
          allBodies.push([`[${tier}] ${pk}/${dev}/${sid}`, out.body + " " + (out.actions || "") + " " + JSON.stringify(out.crumbs || "")]);
          rendered++;
        } catch (e) { errors.push(`[${tier}] ${pk}/${dev}/${sid}: THROWS — ${e.message}`); }
      }
    }
  }
}
// tier-gate sanity
DATA.state.tier = "essential";
if (DATA.has("l2") || DATA.has("vault") || DATA.has("ceo")) errors.push("gates: essential should lock l2/vault/ceo");
DATA.state.tier = "professional";
if (!DATA.has("l2") || !DATA.has("sms") || DATA.has("webhook")) errors.push("gates: professional should open l2+sms, keep webhook enterprise-locked");

// validate every data-go target resolves
const goRe = /data-go="([^"]+)"/g;
for (const [where, html] of allBodies) {
  let m;
  while ((m = goRe.exec(html))) {
    const tgt = m[1];
    if (tgt === "launcher") continue;
    const [p, d, s] = tgt.split("/");
    if (!PERSONAS[p]) { errors.push(`${where}: data-go → unknown persona "${tgt}"`); continue; }
    if (d !== "web" && d !== "mobile") { errors.push(`${where}: data-go → bad device "${tgt}"`); continue; }
    if (!screens[p][d].has(s)) errors.push(`${where}: data-go → missing screen "${tgt}"`);
  }
}

// nav/tab targets + parents
for (const [pk, P] of Object.entries(PERSONAS)) {
  for (const g of P.nav) for (const it of g.items) if (!screens[pk].web.has(it.id)) errors.push(`${pk}: nav item "${it.id}" has no web screen`);
  for (const tb of P.tabs) if (!screens[pk].mobile.has(tb.id)) errors.push(`${pk}: tab "${tb.id}" has no mobile screen`);
  for (const [child, par] of Object.entries(P.parent || {})) if (!screens[pk].web.has(par)) errors.push(`${pk}: parent of ${child} → missing "${par}"`);
  for (const [child, par] of Object.entries(P.tabParent || {})) if (!screens[pk].mobile.has(par)) errors.push(`${pk}: tabParent of ${child} → missing "${par}"`);
}

// ledger demo integrity
DATA.approve("LV-0481");
const lv = DATA.requests.find(r => r.id === "LV-0481");
if (lv.status !== "approved") errors.push("ledger: approve(LV-0481) did not set approved");
if (DATA.audit[0].obj !== "LV-0481") warns.push("ledger: audit tail head is " + DATA.audit[0].obj);
DATA.approve("EX-0210"); // L1 claim → escalates? EX is already L2; settle
const ex = DATA.requests.find(r => r.id === "EX-0210");
if (ex.status !== "approved") errors.push("ledger: settle EX-0210 failed");
const id = DATA.submitRequest("Leave", "test");
if (!DATA.requests.find(r => r.id === id)) errors.push("ledger: submitRequest failed");
if (DATA.audit[0].obj !== id) warns.push("ledger: submit fact not at audit head");

/* ---------- v2.3.2.db — data layer integrity ---------- */
// CRUD roundtrip on db_people
const n0 = DB.rows("db_people");
DB.add("db_people", "employees", { id: "EMP-9999", name: "Smoke Test", pos: "QA", div: "Admin", team: "Line A", state: "present", in: "08:00", attend: 100, ot: 0, leaveBal: 9, since: "Jun 2026" });
if (DB.rows("db_people") !== n0 + 1) errors.push("db: add row failed");
if (!DATA.team.find(e => e.id === "EMP-9999")) errors.push("db: added Line A member not visible through DATA.team lens");
if (!DB.del("db_people", "employees", "id", "EMP-9999")) errors.push("db: delete row failed");
if (DB.rows("db_people") !== n0) errors.push("db: row count after delete mismatch");
// append-only audit ledger must refuse deletes
if (DB.del("db_audit", "events", "obj", "LV-0476") !== false) errors.push("db: audit ledger allowed a delete (must be append-only)");
// derived store must refuse direct writes
if (DB.add("dw_reports", "series", { id: "hack" }) !== null) errors.push("db: derived store accepted a direct write");
// backup → mutate → restore roundtrip (per-module blast radius)
const reqCount = DB.rows("db_workflow");
const bk = DB.backups.now(["db_workflow"], "manual", "smoke");
DB.add("db_workflow", "requests", { id: "ZZ-0001", type: "Leave", who: "Smoke", detail: "x", dates: "—", status: "pending", stage: "L1 · Manager", sla: "—", note: "", submitted: "—" });
const peopleBefore = JSON.stringify(DB.list("db_people", "employees"));
DB.backups.restore(bk.id, ["db_workflow"]);
if (DB.rows("db_workflow") !== reqCount) errors.push("db: restore did not rewind db_workflow");
if (JSON.stringify(DB.list("db_people", "employees")) !== peopleBefore) errors.push("db: restoring db_workflow touched db_people (blast radius breached)");
// selectable multi-store backup + export shape
const bk2 = DB.backups.now(["db_people", "db_payroll"], "manual", "smoke2");
if (bk2.stores.length !== 2) errors.push("db: selectable backup wrong store set");
const exp = DB.exportObj(["db_audit"]);
if (!exp.stores.db_audit || !exp.tenant) errors.push("db: export shape wrong");
// scheduler: policies fire once per window
DB.list("db_platform", "backup_policies").forEach(p => p.last = null);
const due1 = DB.tick();
if (!due1.length) errors.push("db: scheduler found nothing due on cold start");
if (DB.tick().length !== 0) errors.push("db: scheduler re-fired inside the same window");
// restore drill + dw rebuild
if (DB.drill().result !== "pass") errors.push("db: restore drill failed");
if (typeof DB.rebuildReports() !== "number") errors.push("db: dw_reports rebuild failed");
// docs store gated on essential (provisioned lazily)
DATA.state.tier = "essential";
if (DB.provisioned("db_docs")) errors.push("db: db_docs should not be provisioned on essential");
DATA.state.tier = "professional";
if (!DB.provisioned("db_docs")) errors.push("db: db_docs should be provisioned on professional");

console.log(`rendered ${rendered} screens across ${Object.keys(PERSONAS).length} personas ×2 devices`);
if (warns.length) console.log("WARN:\n  " + warns.join("\n  "));
if (errors.length) { console.log("FAIL:\n  " + errors.join("\n  ")); process.exit(1); }
console.log("ALL CHECKS PASS");
