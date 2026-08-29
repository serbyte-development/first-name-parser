---
summary: "Development commands, CI contract, TypeScript/build configuration, package exports, and generated dist ownership."
paths:
  - package.json
  - package-lock.json
  - tsconfig.json
  - .github/workflows/ci.yml
  - dist/
  - test/
read_more:
  - pages/parser-behavior.md
  - pages/benchmark-strategy.md
---

# Build, Test, Package

## Local validation

Package scripts:
- `npm test`: Node test runner through `tsx` over `test/*.test.ts`.
- `npm run typecheck`: strict TypeScript check with no emit.
- `npm run build`: `tsup src/index.ts --format esm,cjs --dts --clean`.
- `npm run check`: typecheck, tests, then build.
- `npm run benchmark:public`: probablepeople, the six-shape Census vocabulary sweep, and the reconstructed 804,225-case Census suite.
- `npm run benchmark:private`: private real-form greeting benchmark against current `src/index.ts` via `tsx`, avoiding stale `dist` results.
- `npm run benchmark:private:two-letter`: private diagnostic for clean two-letter first tokens and their Census frequency.
- `npm run prepare`: build, including install/package preparation flows.

`tsconfig.json` targets ES2022 with NodeNext module semantics and includes `src/**/*.ts` plus `test/**/*.ts`.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and pull requests. Matrix is Node 20 and 22. Each job uses `npm ci` then `npm run check`.

`package.json` declares Node `>=18`, so local/public runtime support is broader than the CI matrix.

## Package surface

Package is ESM-first with CommonJS compatibility:
- ESM: `dist/index.js`
- CommonJS: `dist/index.cjs`
- Types: `dist/index.d.ts`

Only `dist` is included in the package files list. The root export maps `types`, `import`, and `require` to generated artifacts.

Treat `src/index.ts` as source of truth. Rebuild after source changes when generated `dist/` needs to match the repository state.
