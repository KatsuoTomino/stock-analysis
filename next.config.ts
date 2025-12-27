import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // ビルドエラーを無視（scriptsディレクトリのエラーを回避）
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
