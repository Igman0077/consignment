import { HelpCircle } from "lucide-react";

export function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}
