import type { Currency } from "@/types";
import { type Money, splitMoney } from "./calculations";

const cache = new Map<string, Intl.NumberFormat>();

function nf(currency: Currency, digits: number) {
  const key = `${currency}:${digits}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: digits, minimumFractionDigits: digits });
    cache.set(key, f);
  }
  return f;
}

export function formatMoney(amount: number, currency: Currency, opts: { compact?: boolean; cents?: boolean } = {}): string {
  if (opts.compact && Math.abs(amount) >= 10000) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(amount);
  }
  return nf(currency, opts.cents ? 2 : 0).format(amount);
}

/** "$4,200 + €1,100" — preferred currency first. */
export function formatMoneyMulti(money: Money, preferred: Currency): string {
  const { primary, others } = splitMoney(money, preferred);
  // Skip a zero preferred-currency amount when other currencies carry the value.
  const parts = primary === 0 && others.length ? [] : [formatMoney(primary, preferred)];
  for (const [c, v] of others) parts.push(formatMoney(v, c));
  return parts.join(" + ");
}

export function formatRate(rate: number | null | undefined, currency: Currency): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${formatMoney(rate, currency)}/h`;
}

export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}
