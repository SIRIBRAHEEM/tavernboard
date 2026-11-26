// TavernBoard chain configuration.
// Change REALM_PATH on the single line below once the realm is deployed.
// Everything else in the app reads from this file.

export const CONFIG = {
  // Gno realm that stores the board. One-line change once deployed.
  REALM_PATH: "gno.land/r/g1q5ra3080jnhk8skw664lyz9p97t7reddup89rl/tavernboard",

  // Current Gno.land testnet (Onyx). Source: docs.gno.land networks page.
  CHAIN_ID: "onyx-1",
  RPC_ENDPOINT: "https://rpc.onyx.testnets.gno.land:443",
  RPC_ALIAS: "https://rpc.latest.testnets.gno.land:443",

  // gnoweb instance that renders the same testnet.
  GNOWEB_BASE: "https://onyx.testnets.gno.land",

  // Render subpath passed to the realm Render function. Empty means root.
  RENDER_PATH: "",

  // Read timeout for chain queries, in milliseconds.
  READ_TIMEOUT_MS: 8000,
};

// Human readable realm link on gnoweb, e.g. https://onyx.testnets.gno.land/r/tavernboard
export function realmWebUrl(config = CONFIG) {
  const path = config.REALM_PATH.replace(/^gno\.land\//, "");
  return `${config.GNOWEB_BASE}/${path}`;
}
