import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@lohn/auth";
import { OrgPanel } from "./org-panel";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">lohn.cc</h1>
        <p className="text-sm text-gray-500">
          CRM / ERP core — sign in to continue.
        </p>
        <div className="flex gap-3">
          <Link className="rounded bg-black px-4 py-2 text-white" href="/sign-in">
            Sign in
          </Link>
          <Link className="rounded border px-4 py-2" href="/sign-up">
            Sign up
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">lohn.cc</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      {session.session.activeOrganizationId && (
        <nav className="flex gap-3 text-sm">
          <Link href="/crm" className="rounded border px-3 py-1.5 underline">
            CRM
          </Link>
          <Link href="/erp" className="rounded border px-3 py-1.5 underline">
            ERP
          </Link>
        </nav>
      )}
      <OrgPanel />
    </main>
  );
}
