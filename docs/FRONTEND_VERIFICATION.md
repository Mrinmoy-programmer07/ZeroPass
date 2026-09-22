# Frontend verification

Historical Level 1 simulation report. The simulation was replaced during Level 2;
see [LEVEL2_VERIFICATION.md](LEVEL2_VERIFICATION.md) for the current interface.

Verified locally on 2026-09-21 using the Vite development server and a real browser.
The user flow is Explore demo → Run demo → Demo complete → Reset demo → End demo.
This flow changes local React state only; it has no API, wallet or chain boundary.

| Check | Result |
| --- | --- |
| Production TypeScript/Vite build | Passed |
| Frontend lint | Passed |
| Initial page | Rendered demo disclosure, pending deployment and public metadata explanation |
| Explore demo | Revealed illustrative membership credential and Run demo control |
| Run demo | Progressed to Demo complete with explicit no-proof/no-transaction disclosure |
| Reset demo | Restored Run demo control |
| End demo | Returned to initial Explore demo state |
| Browser errors | None reported |
| Mobile viewport | At 390px width, document width did not exceed viewport width |

Real wallet interaction and network finality were not tested through this UI
because those capabilities are not implemented. The separate Node proof and
deployment tooling has its own checks documented in [TESTING.md](TESTING.md).
