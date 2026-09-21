import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const candidates = process.platform === 'win32' ? [
  join(process.env.LOCALAPPDATA || '', 'Programs/DockerDesktop/resources/bin/docker.exe'),
  join(process.env.ProgramFiles || '', 'Docker/Docker/resources/bin/docker.exe'),
] : [];
const docker = candidates.find(existsSync) || 'docker';
const result = spawnSync(docker, ['run', '--rm', '--name', 'zeropass-proof-server',
  '-p', '127.0.0.1:6300:6300', 'midnightntwrk/proof-server:8.1.0', 'midnight-proof-server'], { stdio: 'inherit' });
if (result.error) console.error('Docker was not found. Install and start Docker Desktop.');
process.exitCode = result.status ?? 1;
