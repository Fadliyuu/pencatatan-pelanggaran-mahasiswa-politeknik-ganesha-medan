/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', "i.pravatar.cc"],
  }
}

module.exports = nextConfig 