import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/tarefasdiarias",
  assetPrefix: "/tarefasdiarias/",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
