const integerFormat = new Intl.NumberFormat("en-IN");
const decimalFormat = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatNumber(value: number): string {
  return integerFormat.format(value);
}

export function formatDecimal(value: number): string {
  return decimalFormat.format(value);
}

/** Signed value with a real minus sign, e.g. "+1.2" or "−1.2". */
export function formatSigned(value: number): string {
  if (value === 0) return "0.0";
  const sign = value > 0 ? "+" : "−";
  return `${sign}${decimalFormat.format(Math.abs(value))}`;
}

/** Share of a total as a percentage with one decimal place (display only). */
export function formatShare(part: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${decimalFormat.format((part / total) * 100)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

/** Signed whole number with a real minus sign, e.g. "+3" or "−4". */
export function formatSignedInt(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${integerFormat.format(Math.abs(Math.round(value)))}`;
}

/** A 0–1 share as a whole percentage, e.g. 0.624 → "62%". */
export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Lowercases a label for use mid-sentence, keeping acronyms like LMS and CGPA. */
export function lowerLabel(text: string): string {
  return text
    .split(" ")
    .map((word) => (/^[A-Z]{2,}/.test(word) ? word : word.toLowerCase()))
    .join(" ");
}
