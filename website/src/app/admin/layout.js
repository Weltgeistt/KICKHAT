import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, isAdmin } from "@/lib/session";
import AdminShell from "@/components/AdminShell";

// Sunucu tarafı koruma: admin değilse giriş sayfasına yönlendir
export default async function AdminLayout({ children }) {
  const session = await readSession(await cookies());
  if (!isAdmin(session)) {
    redirect("/login");
  }

  return <AdminShell username={session.username}>{children}</AdminShell>;
}
