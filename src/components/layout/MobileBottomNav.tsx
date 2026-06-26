"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ShoppingBag,
  ShoppingCart,
  User,
  Menu,
  X,
  Home,
  BookOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner = session?.user?.role === "OWNER";
  const hideOnAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (hideOnAdmin) return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, hideOnAdmin]);

  if (hideOnAdmin) return null;

  const tabs = [
    { href: "/shop", label: "Browse", icon: ShoppingBag },
    {
      href: session ? "/cart" : "/login?message=Sign in to view your cart",
      label: "Cart",
      icon: ShoppingCart,
    },
    {
      href: session ? "/account" : "/login",
      label: session ? "Account" : "Sign in",
      icon: User,
    },
  ];

  function isActive(href: string) {
    const path = href.split("?")[0];
    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <>
      {/* Bottom tab bar — thumb-friendly on phones */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-4">
          {tabs.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-semibold transition-colors duration-150",
                isActive(href)
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-500 hover:bg-slate-100 active:bg-slate-200"
              )}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-semibold text-slate-500 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
            Menu
          </button>
        </div>
      </nav>

      {/* Full-screen menu sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <p className="text-lg font-bold text-slate-900">Menu</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <ul className="space-y-1 p-3">
              <MenuLink href="/" icon={Home} label="Home" onNavigate={() => setMenuOpen(false)} />
              <MenuLink
                href="/how-it-works"
                icon={BookOpen}
                label="How it works"
                onNavigate={() => setMenuOpen(false)}
              />
              {isOwner && (
                <MenuLink
                  href="/admin"
                  icon={LayoutDashboard}
                  label="Owner dashboard"
                  onNavigate={() => setMenuOpen(false)}
                />
              )}
              {!session ? (
                <>
                  <MenuLink
                    href="/login"
                    icon={LogIn}
                    label="Sign in"
                    onNavigate={() => setMenuOpen(false)}
                  />
                  <MenuLink
                    href="/register"
                    icon={UserPlus}
                    label="Create account"
                    onNavigate={() => setMenuOpen(false)}
                  />
                </>
              ) : (
                <li>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex min-h-[3rem] w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-slate-800 active:bg-slate-100"
                  >
                    <LogOut className="h-5 w-5 text-slate-500" />
                    Sign out
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className="flex min-h-[3rem] items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
      >
        <Icon className="h-5 w-5 text-slate-500" />
        {label}
      </Link>
    </li>
  );
}
