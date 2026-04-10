import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Turbopack with empty config (no special alias needed for client-only usage)
  turbopack: {},
  // Webpack fallback — exclude Node.js-only ONNX modules from client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "sharp$": false,
        "onnxruntime-node$": false,
      };
    }
    return config;
  },
};

export default nextConfig;
