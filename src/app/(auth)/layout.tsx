import { redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.service";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import DemoNotice from "@/components/layout/DemoNotice";

// ─── Authenticated layout ─────────────────────────────────────────────────────
//
// Wraps every page inside the (auth) route group.
// • Redirects to "/" if the user is not signed in.
// • Shows DemoNotice at the top when the signed-in user is a demo account.
// • Renders Sidebar alongside the page content.

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/");
  }

  // Look up isDemo — it lives on the User model, not the session token.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isDemo: true },
  });

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {user?.isDemo && <DemoNotice />}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
