"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  Receipt,
  PlusCircle,
  Tags,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/items", label: "Items", icon: Package, match: "items-list" as const },
  { href: "/admin/items/new", label: "Add Item", icon: PlusCircle, exact: true },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/sale-events", label: "Scheduled Sales", icon: CalendarDays, match: "sale-events" as const },
  { href: "/admin/sales", label: "Sales & Payments", icon: Receipt },
  { href: "/admin/customers", label: "Customers", icon: Users, match: "customers" as const },
  { href: "/admin/settings", label: "Shop Settings", icon: Settings },
];

function isNavActive(
  pathname: string,
  href: string,
  opts?: { exact?: boolean; match?: "items-list" | "customers" | "sale-events" }
): boolean {
  if (opts?.exact) return pathname === href;

  if (opts?.match === "sale-events") {
    return pathname === "/admin/sale-events" || pathname.startsWith("/admin/sale-events/");
  }

  if (opts?.match === "customers") {
    return pathname === "/admin/customers" || pathname.startsWith("/admin/customers/");
  }

  if (opts?.match === "items-list") {
    if (pathname === "/admin/items") return true;
    return (
      pathname.startsWith("/admin/items/") &&
      !pathname.startsWith("/admin/items/new")
    );
  }

  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="section-block grid grid-cols-1 gap-1.5 p-2 sm:grid-cols-2 sm:gap-2 lg:flex lg:flex-wrap"
      aria-label="Owner dashboard"
    >
      {links.map(({ href, label, icon: Icon, exact, match }) => {
        const active = isNavActive(pathname, href, { exact, match });
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold transition-all duration-150 sm:text-sm",
              active
                ? "bg-brand-600 text-white shadow-sm ring-1 ring-brand-700"
                : "text-slate-700 hover:bg-slate-100 hover:ring-1 hover:ring-slate-200 active:bg-slate-200"
            )}
          >
            <Icon className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
