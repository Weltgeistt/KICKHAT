export default function sitemap() {
  const base = "https://kickhat.net";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/downloads`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
  ];
}
