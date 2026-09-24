import { localProofUrl, UserError } from './core.ts';

// Only a health/version request. No credential inputs are sent by this check.
export async function checkLocalProver(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<void> {
  try {
    const response = await fetcher(new URL('version', localProofUrl()), { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new UserError('The local proof server is not ready. Start proof server 8.1.0 and try again.');
    if (!(await response.text()).includes('8.1.0')) throw new UserError('The local proof server has the wrong version. ZeroPass requires proof server 8.1.0.');
  } catch (error) {
    if (error instanceof UserError) throw error;
    throw new UserError('Cannot reach your local proof server at 127.0.0.1:6300. Start it and allow this site local-network/localhost access in your browser settings. In Brave, check brave://settings/content/localhostAccess.');
  }
}
