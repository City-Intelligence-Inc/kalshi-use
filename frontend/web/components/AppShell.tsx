"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/agent", label: "Agent", icon: "⚙" },
  { href: "/trades", label: "Trades", icon: "↕" },
  { href: "/settings", label: "Settings", icon: "☰" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-brand">Kalshi Use</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
}
