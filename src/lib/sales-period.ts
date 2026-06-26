export type SalesPeriod = "day" | "week" | "month";

export type SalesPeriodRange = {
  period: SalesPeriod;
  start: Date;
  end: Date;
  label: string;
  /** Value for form inputs (date, week, or month string) */
  inputValue: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toLocalDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toLocalMonthValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** ISO week string e.g. 2026-W25 */
export function toIsoWeekValue(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${d.getFullYear()}-W${pad(weekNum)}`;
}

function parseIsoWeek(isoWeek: string): { start: Date; end: Date } {
  const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error("Invalid week");

  const year = Number(match[1]);
  const week = Number(match[2]);

  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - jan4Day + 1);

  const start = new Date(mondayWeek1);
  start.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function resolveSalesPeriod(
  periodParam?: string,
  dateParam?: string
): SalesPeriodRange {
  const period: SalesPeriod =
    periodParam === "week" || periodParam === "month" ? periodParam : "day";

  const now = new Date();

  if (period === "day") {
    const base = dateParam ? new Date(dateParam + "T12:00:00") : now;
    const start = startOfDay(base);
    const end = endOfDay(base);
    return {
      period,
      start,
      end,
      inputValue: toLocalDateValue(base),
      label: new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(start),
    };
  }

  if (period === "week") {
    const weekValue = dateParam?.match(/^\d{4}-W\d{2}$/) ? dateParam : toIsoWeekValue(now);
    const { start, end } = parseIsoWeek(weekValue);
    return {
      period,
      start,
      end,
      inputValue: weekValue,
      label: `Week of ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(start)}`,
    };
  }

  const monthValue =
    dateParam?.match(/^\d{4}-\d{2}$/) ? dateParam : toLocalMonthValue(now);
  const [y, m] = monthValue.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return {
    period,
    start,
    end,
    inputValue: monthValue,
    label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(start),
  };
}

export function orderInPeriod(
  order: { createdAt: Date; paidAt: Date | null },
  range: SalesPeriodRange
) {
  const ref = order.paidAt ?? order.createdAt;
  const t = new Date(ref).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}
