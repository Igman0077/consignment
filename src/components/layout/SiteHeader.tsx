"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ShoppingBag,
  ShoppingCart,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserPlus,
  Store,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteHeader({ shopName }: { shopName: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";

  function navClass(href: string) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return cn("nav-pill", active && "nav-pill-active");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] shadow-sm">
      <div className="container-page flex h-14 items-center justify-between gap-4 sm:h-16">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-brand-700 transition-colors hover:bg-brand-50"
        >
          <Store className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span className="truncate text-base sm:text-lg">{shopName}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <Link href="/shop" className={navClass("/shop")}>
            <ShoppingBag className="h-4 w-4" />
            Browse Items
          </Link>

          {session ? (
            <>
              <Link href="/cart" className={navClass("/cart")}>
                <ShoppingCart className="h-4 w-4" />
                My Cart
              </Link>
              <Link href="/account" className={navClass("/account")}>
                <Package className="h-4 w-4" />
                My Account
              </Link>
              {isOwner && (
                <Link href="/admin" className={navClass("/admin")}>
                  <LayoutDashboard className="h-4 w-4" />
                  Owner Dashboard
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="nav-pill ml-1"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={navClass("/login")}>
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
              <Link href="/register" className={navClass("/register")}>
                <UserPlus className="h-4 w-4" />
                Create Account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
