/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Add this option to ignore TypeScript errors during build
  typescript: {
    // !! WARN !!
    // Ignoring type checking for build - only use this as a temporary solution
    ignoreBuildErrors: true,
  },
  // Add this if you also want to ignore ESLint errors
  eslint: {
    // !! WARN !!
    // Ignoring ESLint errors for build - only use this as a temporary solution
    ignoreDuringBuilds: true,
  },
};

export default config;
