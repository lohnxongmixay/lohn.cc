import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@lohn/auth";
import { db } from "@lohn/db";
import { organization } from "@lohn/db/schema";
import { NavBar } from "./nav-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const organizationId = session.session.activeOrganizationId;
  let orgName: string | null = null;
  if (organizationId) {
    const [org] = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId));
    orgName = org?.name ?? null;
  }

  return (
    <div className="min-h-screen">
      <NavBar userEmail={session.user.email} orgName={orgName} />
      {children}
    </div>
  );
}
