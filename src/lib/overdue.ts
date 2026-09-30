import type { Task } from "@/types";
import { addDays, formatDate, nowTimeStr, todayStr } from "./dates";
import { occursOn } from "./recurrence";

/** Limite de segurança: nunca varremos mais de 5 anos para trás. */
const MAX_LOOKBACK_DAYS = 1825;

/** Um dia em que a atividade deveria ter sido feita e não foi. */
export interface OverdueActivity {
  task: Task;
  /** Datas em atraso, da mais recente para a mais antiga. */
  dates: string[];
}

export interface OverdueSummary {
  /** Total de marcações pendentes (soma das datas de todas as atividades). */
  occurrences: number;
  activities: OverdueActivity[];
}

/**
 * Data a partir da qual faz sentido cobrar a atividade:
 * a maior entre a data de início e a data de criação — assim não contamos
 * ocorrências anteriores à existência da atividade.
 */
function overdueStartDate(task: Task, reference: string): string {
  const created =
    task.createdAt instanceof Date && !Number.isNaN(task.createdAt.getTime())
      ? formatDate(task.createdAt)
      : "";
  const start = task.startDate || "";

  // Datas em "YYYY-MM-DD" podem ser comparadas como texto.
  let from = start > created ? start : created;
  if (!from) from = addDays(reference, -60);

  const floor = addDays(reference, -MAX_LOOKBACK_DAYS);
  return from < floor ? floor : from;
}

/**
 * Datas em que a atividade estava prevista e continua sem marcação.
 * O dia de hoje só entra depois do horário da atividade.
 */
export function getOverdueDates(
  task: Task,
  reference: string = todayStr(),
  referenceTime: string = nowTimeStr()
): string[] {
  if (!task.active) return [];

  const dates: string[] = [];
  const from = overdueStartDate(task, reference);

  for (let cursor = from; cursor <= reference; cursor = addDays(cursor, 1)) {
    const isPast = cursor < reference;
    const isDueToday = cursor === reference && (!task.time || task.time <= referenceTime);
    if (!isPast && !isDueToday) continue;
    if (task.completions?.[cursor] === true) continue;
    if (!occursOn(task, cursor)) continue;
    dates.push(cursor);
  }

  return dates.reverse();
}

/** Agrupa o atraso por atividade e devolve o total de marcações pendentes. */
export function getOverdueSummary(
  tasks: Task[],
  reference: string = todayStr(),
  referenceTime: string = nowTimeStr()
): OverdueSummary {
  const activities: OverdueActivity[] = [];
  let occurrences = 0;

  tasks.forEach((task) => {
    const dates = getOverdueDates(task, reference, referenceTime);
    if (dates.length === 0) return;
    occurrences += dates.length;
    activities.push({ task, dates });
  });

  activities.sort(
    (a, b) =>
      b.dates.length - a.dates.length ||
      a.task.description.localeCompare(b.task.description, "pt-BR")
  );

  return { occurrences, activities };
}
