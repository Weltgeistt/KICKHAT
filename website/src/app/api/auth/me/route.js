import { cookies } from "next/headers";
import { readSession, isAdmin } from "@/lib/session";

export async function GET() {
  const session = await readSession(await cookies());
  if (!session) return Response.json({ username: null });
  return Response.json({
    username: session.username,
    role: session.role,
    isAdmin: isAdmin(session),
  });
}
