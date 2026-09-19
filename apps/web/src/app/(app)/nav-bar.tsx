"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

const LINKS = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/crm", label: "CRM", exact: false },
  { href: "/erp", label: "ERP", exact: false },
] as const;

export function NavBar({
  userEmail,
  orgName,
}: {
  userEmail: string;
  orgName: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/" className="text-lg font-semibold">
            lohn.cc
          </Link>
          <nav className="flex gap-1 text-sm">
            {LINKS.map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-3 py-1.5 ${
                    isActive
                      ? "bg-black text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {(pathname === "/crm" || pathname === "/crm/board") && (
              <Link
                href={pathname === "/crm" ? "/crm/board" : "/crm"}
                className="rounded px-3 py-1.5 text-xs text-gray-400 underline"
              >
                {pathname === "/crm" ? "Board view" : "List view"}
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {orgName && (
            <span className="rounded-full border px-3 py-1 text-xs text-gray-500">
              {orgName}
            </span>
          )}
          <span className="text-gray-500">{userEmail}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
