// Run both browser gates inside one explicit Node entry point.
// This avoids platform-specific shell chaining and makes completion/exit status unambiguous.
await import("./browser-smoke.mjs");
await import("./m6-ability-composer-smoke.mjs");
console.log("PASS complete Chromium suite: 9/9 + Ability Composer");
