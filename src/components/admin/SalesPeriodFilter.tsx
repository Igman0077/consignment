"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  SalesPeriod,
  toIsoWeekValue,
  toLocalDateValue,
  toLocalMonthValue,
} from "@/lib/sales-period";
import { cn } from "@/lib/utils";

type Props = {
  period: SalesPeriod;
  inputValue: string;
  periodLabel: string;
  paidCount: number;
  unpaidCount: number;
  paidTotal: number;
};

const periods: { id: SalesPeriod; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export function SalesPeriodFilter({
  period,
  inputValue,
  periodLabel,
  paidCount,
  unpaidCount,
  paidTotal,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePeriod, setActivePeriod] = useState<SalesPeriod>(period);
  const [value, setValue] = useState(inputValue);

  function apply(nextPeriod: SalesPeriod, nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPeriod);
    params.set("date", nextValue);
    router.push(`/admin/sales?${params.toString()}`);
  }

  function handlePeriodChange(next: SalesPeriod) {
    setActivePeriod(next);
    const now = new Date();
    let nextValue = value;
    if (next === "day") {
      nextValue = value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : toLocalDateValue(now);
    } else if (next === "week") {
      nextValue = value.match(/^\d{4}-W\d{2}$/) ? value : toIsoWeekValue(now);
    } else {
      nextValue = value.match(/^\d{4}-\d{2}$/) ? value : toLocalMonthValue(now);
    }
    setValue(nextValue);
    apply(next, nextValue);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply(activePeriod, value);
  }

  const inputLabel =
    activePeriod === "day" ? "Select day" : activePeriod === "week" ? "Select week" : "Select month";

  const inputType =
    activePeriod === "day" ? "date" : activePeriod === "week" ? "week" : "month";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {periods.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => handlePeriodChange(id)}
            className={cn(
              "min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150",
              activePeriod === id
                ? "bg-brand-600 text-white shadow-sm ring-1 ring-brand-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="sales-period-input" className="block text-sm font-semibold text-slate-700">
            {inputLabel}
          </label>
          <input
            id="sales-period-input"
            name="date"
            type={inputType}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 transition-all duration-150 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            required
          />
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white transition-all duration-150 hover:bg-brand-700 active:bg-brand-800"
        >
          Show sales
        </button>
      </form>

      <div className="rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">Showing: {periodLabel}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>
            <strong className="text-slate-900">{paidCount}</strong> paid
          </span>
          <span>
            <strong className="text-slate-900">{unpaidCount}</strong> unpaid
          </span>
          <span>
            Total paid:{" "}
            <strong className="text-brand-700">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                paidTotal
              )}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
