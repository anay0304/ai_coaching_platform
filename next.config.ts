import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages use Node.js-native APIs (e.g. `net`, `tls`, `fs`).
  // Marking them external prevents Webpack from trying to bundle them —
  // the Cloudflare worker runtime makes them available at runtime via the
  // `nodejs_compat` compatibility flag declared in wrangler.jsonc.
  serverExternalPackages: ["pg", "bcryptjs"],

};

export default nextConfig;
