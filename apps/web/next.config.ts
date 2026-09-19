import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["app.lohn.cc"],
  transpilePackages: ["@lohn/auth", "@lohn/db"],
};

export default nextConfig;
