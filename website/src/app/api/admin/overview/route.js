import { botFetch } from "@/lib/botApi";

export async function GET() {
  return botFetch("/api/admin/overview");
}
