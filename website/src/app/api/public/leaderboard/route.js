import { botFetch } from "@/lib/botApi";

export async function GET(request) {
  const limit = request.nextUrl.searchParams.get("limit") || "50";
  return botFetch(`/api/leaderboard?limit=${encodeURIComponent(limit)}`);
}
