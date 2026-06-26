import { Suspense } from "react";

export default function AdminSalesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="container-page py-8 text-slate-600">Loading…</div>}>{children}</Suspense>;
}
