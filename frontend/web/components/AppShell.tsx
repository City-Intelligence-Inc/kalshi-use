"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, BarChart3, ScanLine, Activity, Settings } from "lucide-react";
import { getToken } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/positions", label: "Positions", icon: BarChart3 },
  { href: "/predict", label: "Predict", icon: ScanLine },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className="sidebar-icon">
                <Icon size={20} />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
}
