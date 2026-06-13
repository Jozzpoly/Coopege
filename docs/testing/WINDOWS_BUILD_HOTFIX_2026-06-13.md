# Windows build hotfix — 2026-06-13

## Symptoms

- `TS18003: No inputs were found` for `.build/browser/tsconfig.runtime.json`.
- The same build then reported `spawnSync tsc ENOENT`.
- `npm run dev` served `Not found. Uruchom najpierw npm run build.`

## Root causes

1. `tools/build/build.mjs` generated absolute Windows include globs containing backslashes.
2. Any local TypeScript compiler error was caught and incorrectly retried through a global `tsc`, masking the original failure with `ENOENT`.
3. `dist` was deleted before compilation completed, so a failed build removed the last working HTML artifacts.
4. The registry repair script contained UTF-8 Polish text without BOM, which Windows PowerShell 5.1 parsed using a legacy code page.

## Fix

- Generated TypeScript configs now use config-relative paths and forward slashes.
- Build uses only the project-local TypeScript compiler through `process.execPath`.
- `dist` is replaced only after both runtime and Studio bundles compile successfully.
- The registry repair script is ASCII-only and compatible with Windows PowerShell 5.1.
