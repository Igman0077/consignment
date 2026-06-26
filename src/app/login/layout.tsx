import { Suspense } from "react";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="container-page py-20 text-center">Loading...</div>}>{children}</Suspense>;
}
