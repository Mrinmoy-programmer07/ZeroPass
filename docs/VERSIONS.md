# ZeroPass toolchain

Pinned to Midnight's Preview/Preprod compatibility matrix, checked 2026-09-20:

| Component | Version |
| --- | --- |
| Node.js | 22 or later (validated locally with 24.21.0) |
| Compact compiler | 0.31.1 |
| Compact language | 0.23.0 |
| Compact runtime | 0.16.0 |
| Midnight.js and providers | 4.1.1 |
| Compact.js (via midnight-js-protocol) | 2.5.1 |
| Proof server | 8.1.0 |

Reference: https://docs.midnight.network/relnotes/support-matrix

The Compact CLI version is distinct from the compiler version. Install the
pinned compiler with `compact update --no-set-default 0.31.1`.
`npm run compile` selects it explicitly; on Windows it runs inside Ubuntu WSL
to avoid Windows' unrelated `compact.exe`. Set `WSL_DISTRO` if needed.

`npm run check` imports the real generated contract and checks its compiler and
runtime requirements. `npm ci` installs the committed dependency lockfile.
Generated artifacts must come from the compiler, never manual edits.
