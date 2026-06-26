import Link from "next/link";

export function SiteFooter({ shopName }: { shopName: string }) {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-8 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="container-page flex flex-col items-center gap-2 text-center text-sm text-slate-600">
        <p className="font-semibold text-slate-800">{shopName}</p>
        <p>Easy online consignment shopping — browse, claim, bid, and check out.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href="/shop" className="nav-pill text-sm">
            Shop
          </Link>
          <Link href="/how-it-works" className="nav-pill text-sm">
            How It Works
          </Link>
          <Link href="/login" className="nav-pill text-sm">
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}
