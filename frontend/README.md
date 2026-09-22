# ZeroPass frontend

Real Midnight connector, encrypted local credential vault and contract operations.
See the root [README](../README.md) in Level 1 → Level 2 order and the detailed
[Level 2 guide](../docs/LEVEL2.md).

From the repository root:

```sh
npm ci
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run dev
```

`predev` and `prebuild` prepare the public proof assets from `contract/managed/`.
The root dependencies are required by the generated contract import. For hosting,
use the repository-root `vercel.json`; do not deploy this directory in isolation.

Production checks: `npm --prefix frontend run build` and
`npm --prefix frontend run lint`. Public environment settings are listed in
`.env.example`. Never put secrets in a `VITE_*` value.
