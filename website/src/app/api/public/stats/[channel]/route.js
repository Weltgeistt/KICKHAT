import { botFetch } from "@/lib/botApi";

export async function GET(request, { params }) {
  const { channel } = await params;
  const qs = request.nextUrl.searchParams.toString();
  return botFetch(`/api/stats/${encodeURIComponent(channel)}${qs ? `?${qs}` : ""}`);
}
