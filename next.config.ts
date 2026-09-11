import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules it actually reaches — keeps the runtime image small.
  output: "standalone",
};

export default nextConfig;
