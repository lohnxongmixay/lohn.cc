import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">lohn.cc is invite-only</h1>
      <p className="text-sm text-gray-500">
        Public sign-up is closed. If you were invited, use the link from your
        invitation email, or{" "}
        <Link href="/sign-in" className="underline">
          sign in
        </Link>{" "}
        if you already have an account.
      </p>
    </main>
  );
}
