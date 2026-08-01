import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/semester/:sem",
        destination: "/programme/dip-cs-sas/semester/:sem",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
