/* ============================================================
   ADEPTIO · v2.3.2.db — Turso cloud-sync configuration
   Leave url/token empty → the app runs exactly as before
   (localStorage only, no network calls, no badge).
   Fill both → js/turso-sync.js goes live: hybrid offline-first,
   localStorage stays the working cache, Turso is the cloud copy.

   Where the values come from:
     url   : turso db show <name> --url   (libsql://… is fine)
     token : turso db tokens create <name>
   ⚠ Demo trade-off: this token ships to every visitor's browser.
   Use a token scoped to this one database only. For production,
   move writes behind an edge function (see README §Cloud sync).
   ============================================================ */
window.TURSO_CONFIG = {
  url: "https://adeptio-hr-v232-torukung.aws-ap-northeast-1.turso.io",
  token: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODExODc1MzEsImlkIjoiMDE5ZWI3MGMtYWMwMS03MTg4LWE1NGQtNTI4ZGMzMzEwZjIyIiwicmlkIjoiZmU3ODE0Y2ItYjhjNy00YjljLWI0NmMtNWE4OTM5N2ZiYjlkIn0.m7sNX_JCqyxBbbOz_ncfnDd6XbidVf7honS5NEHScCgkykzPGCg4h74TTBVySAiBtdyh89L7orb4Fg2alztZAQ"
};
