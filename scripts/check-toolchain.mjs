import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const info = JSON.parse(await readFile(new URL('contract/managed/compiler/contract-info.json', root)));
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) throw new Error('ZeroPass requires Node.js 22 or newer.');
if (info['compiler-version'] !== '0.31.1' || info['runtime-version'] !== '0.16.0') {
  throw new Error('Regenerate the contract using Compact compiler 0.31.1 and runtime 0.16.0.');
}
const { Contract } = await import('../contract/managed/contract/index.js');
if (typeof Contract !== 'function') throw new Error('Generated Contract export is missing.');
console.log(`Node ${process.versions.node}; compiler ${info['compiler-version']}; runtime ${info['runtime-version']}`);
console.log('Generated contract imports successfully.');
