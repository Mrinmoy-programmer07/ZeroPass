import { copyFile, mkdir, readFile } from 'node:fs/promises';
const circuits = ['register_issuer', 'issue_credential', 'verify_credential', 'revoke_credential'];
const source = new URL('../../contract/managed/', import.meta.url);
const destination = new URL('../public/zeropass/', import.meta.url);
for (const [directory, extensions] of [['keys', ['prover', 'verifier']], ['zkir', ['bzkir']]]) {
  await mkdir(new URL(`${directory}/`, destination), { recursive: true });
  for (const circuit of circuits) for (const extension of extensions) {
    const name = `${directory}/${circuit}.${extension}`;
    if ((await readFile(new URL(name, source))).length === 0) throw new Error(`Missing proof asset: ${name}`);
    await copyFile(new URL(name, source), new URL(name, destination));
  }
}
console.log('Prepared public proof artifacts for all four ZeroPass circuits. No private state copied.');
