// Witnesses return local values only. Never log the context or private state.
function privateBytes(name) {
  return ({ privateState }) => {
    const value = privateState?.[name];
    if (!(value instanceof Uint8Array) || value.length !== 32) {
      throw new Error(`Missing or invalid private state field: ${name} (expected 32 bytes)`);
    }
    return [privateState, value];
  };
}

export const witnesses = {
  get_secret: privateBytes('secret'),
  get_salt: privateBytes('salt'),
  get_credential_type: privateBytes('credentialType'),
  get_admin_secret: privateBytes('adminSecret'),
  get_issuer_secret: privateBytes('issuerSecret'),
};
