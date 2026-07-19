import Link from "next/link";
import type { ReactElement } from "react";

export function Navbar(): ReactElement {
  return (
    <nav className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
      <Link className="font-bold" href="/">MedKit</Link>
      <Link className="font-medium text-indigo-600 hover:text-indigo-700" href="/wallet">Wallet</Link>
    </nav>
  );
}
