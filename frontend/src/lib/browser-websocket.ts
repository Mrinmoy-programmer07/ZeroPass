// The SDK's isomorphic-ws wrapper expects both a default and named constructor.
// Browsers already provide the actual transport; no Node WebSocket shim is needed.
export const WebSocket = globalThis.WebSocket;
export default WebSocket;
