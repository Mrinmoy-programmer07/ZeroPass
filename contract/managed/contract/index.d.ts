import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  get_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_salt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_credential_type(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_admin_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_issuer_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  register_issuer(context: __compactRuntime.CircuitContext<PS>,
                  issuer_id_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array,
                   cred_type_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verify_credential(context: __compactRuntime.CircuitContext<PS>,
                    expected_type_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  register_issuer(context: __compactRuntime.CircuitContext<PS>,
                  issuer_id_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array,
                   cred_type_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verify_credential(context: __compactRuntime.CircuitContext<PS>,
                    expected_type_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  register_issuer(context: __compactRuntime.CircuitContext<PS>,
                  issuer_id_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array,
                   cred_type_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verify_credential(context: __compactRuntime.CircuitContext<PS>,
                    expected_type_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               admin_id_0: Uint8Array): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
