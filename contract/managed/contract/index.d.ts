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
                  issuer_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array,
                   cred_type_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verify_credential(context: __compactRuntime.CircuitContext<PS>,
                    expected_type_0: Uint8Array,
                    scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  register_issuer(context: __compactRuntime.CircuitContext<PS>,
                  issuer_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array,
                   cred_type_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verify_credential(context: __compactRuntime.CircuitContext<PS>,
                    expected_type_0: Uint8Array,
                    scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  identity(secret_0: Uint8Array): Uint8Array;
  credential_commitment(secret_0: Uint8Array,
                        salt_0: Uint8Array,
                        ctype_0: Uint8Array): Uint8Array;
  verification_nullifier(secret_0: Uint8Array,
                         expected_type_0: Uint8Array,
                         scope_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  identity(context: __compactRuntime.CircuitContext<PS>, secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credential_commitment(context: __compactRuntime.CircuitContext<PS>,
                        secret_0: Uint8Array,
                        salt_0: Uint8Array,
                        ctype_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  verification_nullifier(context: __compactRuntime.CircuitContext<PS>,
                         secret_0: Uint8Array,
                         expected_type_0: Uint8Array,
                         scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  register_issuer(context: __compactRuntime.CircuitContext<PS>,
                  issuer_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array,
                   cred_type_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verify_credential(context: __compactRuntime.CircuitContext<PS>,
                    expected_type_0: Uint8Array,
                    scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revoke_credential(context: __compactRuntime.CircuitContext<PS>,
                    commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  credential_exists: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  credential_revoked: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  credential_type: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  credential_issuer: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  issuer_registry: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly admin: Uint8Array;
  readonly total_issued: bigint;
  readonly total_verified: bigint;
  used_nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  verification_scopes: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
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
               admin_id_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
