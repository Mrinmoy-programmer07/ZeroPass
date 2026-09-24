import { safeError, UserError, withTimeout } from './core.ts';
export type Phase = 'idle' | 'building' | 'proving' | 'approval' | 'submitting' | 'pending' | 'success' | 'failed' | 'unknown';
export type Progress = { phase: Phase; message: string; txId?: string; blockHeight?: number };
export type Finality = { status: string; txId: string; blockHeight: number };
export type TransactionSteps<U, P, T> = {
  build(): Promise<U>; prove(value: U): Promise<P>; balance(value: P): Promise<{ transaction: T; txId: string }>;
  submit(value: T): Promise<void>; watch(txId: string): Promise<Finality>;
};
export async function confirmTransaction(txId: string, watch: TransactionSteps<unknown, unknown, unknown>['watch'], update: (value: Progress) => void, timeoutMs = 120_000): Promise<Progress> {
  update({ phase: 'pending', txId, message: 'Submitted. Waiting for network finalization…' });
  try {
    const result = await withTimeout(watch(txId), timeoutMs, 'Finalization is taking longer than expected. Check this transaction again; do not resubmit it.');
    if (result.txId !== txId) throw new UserError('The indexer returned a different transaction. Status remains unconfirmed.');
    const progress: Progress = result.status === 'SucceedEntirely'
      ? { phase: 'success', txId, blockHeight: result.blockHeight, message: 'Transaction finalized successfully.' }
      : { phase: 'failed', txId, blockHeight: result.blockHeight, message: 'The transaction finalized with a failed operation. It is not a successful verification.' };
    update(progress); return progress;
  } catch (error) {
    const progress: Progress = { phase: 'unknown', txId, message: safeError(error) };
    update(progress); return progress;
  }
}
export async function executeTransaction<U, P, T>(steps: TransactionSteps<U, P, T>, update: (value: Progress) => void, timeoutMs = 120_000): Promise<Progress> {
  let txId: string | undefined;
  let stage: Phase = 'building';
  try {
    update({ phase: 'building', message: 'Checking the contract and preparing the circuit…' });
    const unproven = await steps.build();
    stage = 'proving';
    update({ phase: 'proving', message: 'Generating a proof with your local proof server…' });
    const proven = await steps.prove(unproven);
    stage = 'approval';
    update({ phase: 'approval', message: 'Review the transaction and test-network fee in your wallet.' });
    const balanced = await steps.balance(proven);
    txId = balanced.txId;
    stage = 'submitting';
    // Retain the public ID before submission: even a transport error may follow acceptance.
    update({ phase: 'submitting', txId, message: 'Submitting the approved transaction…' });
    await steps.submit(balanced.transaction);
    return await confirmTransaction(txId, steps.watch, update, timeoutMs);
  } catch (error) {
    const progress: Progress = { phase: txId ? 'unknown' : 'failed', txId, message: `Stopped during ${stage}. ${safeError(error)}` };
    update(progress); return progress;
  }
}
