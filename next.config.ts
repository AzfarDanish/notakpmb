import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/programme/dip-cs-sas",
        destination: "/programme/dip-cs",
        permanent: true,
      },
      {
        source: "/programme/dip-cs-ai",
        destination: "/programme/dip-cs",
        permanent: true,
      },
      {
        source: "/programme/dip-cs-cyber",
        destination: "/programme/dip-cs",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
