import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Windows ships an unrelated compact.exe. Always use the Midnight CLI in WSL.
const root = fileURLToPath(new URL('../', import.meta.url));
const args = ['compile', '+0.31.1', 'contract/zeropass.compact', 'contract/managed'];
const result = process.platform === 'win32'
  ? spawnSync('wsl.exe', ['-d', process.env.WSL_DISTRO || 'Ubuntu', '--',
      'bash', '-lc', 'exec ~/.local/bin/compact compile +0.31.1 contract/zeropass.compact contract/managed'],
      { cwd: root, stdio: 'inherit' })
  : spawnSync('compact', args, { cwd: root, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
