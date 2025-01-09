/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  env: {
    npm_package_version: process.env.npm_package_version,
    cryptokey: "Fair@Internet@Seller@Marzban@Panel@1401@1402@1403@1",
    cryptoiv: "Seller@Marzban@Panel@1401",
  },
};

module.exports = nextConfig;
