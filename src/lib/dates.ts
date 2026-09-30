export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function todayStr(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  return Math.round((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24));
}

/** Soma (ou subtrai) dias a uma data "YYYY-MM-DD" devolvendo outra data no mesmo formato. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/** Horário atual no formato "HH:MM" (mesmo formato salvo nas atividades). */
export function nowTimeStr(): string {
  const t = new Date();
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

/** Converte "YYYY-MM-DD" para o formato brasileiro "DD/MM/AAAA". */
export function formatDatePtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/** Rótulo amigável para datas passadas: "hoje", "ontem", "há 3 dias" ou "28/09/2026". */
export function relativeDateLabel(dateStr: string, reference = todayStr()): string {
  const diff = daysBetween(reference, dateStr);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff > 1 && diff < 7) return `há ${diff} dias`;
  return formatDatePtBr(dateStr);
}
