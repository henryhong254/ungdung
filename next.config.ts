import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  basePath: "/polaris",
  assetPrefix: "/polaris",
  // Lets Next.js detect when a client's page is from a previous deploy and force
  // a full reload instead of 404-ing on assets that no longer exist after a rebuild.
  deploymentId: process.env.DEPLOYMENT_ID || String(Date.now()),
};

export default nextConfig;
