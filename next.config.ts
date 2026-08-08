import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kill the bottom-left "N" DevIndicator in `next dev` (buildActivity dot
  // stays configurable; `false` removes the whole indicator).
  devIndicators: false,
  poweredByHeader: false,
};

export default nextConfig;
