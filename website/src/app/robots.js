export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/panel", "/api/"],
    },
    sitemap: "https://kickhat.net/sitemap.xml",
  };
}
