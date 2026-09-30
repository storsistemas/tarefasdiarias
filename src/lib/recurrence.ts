import type { Task } from "@/types";
import { daysBetween, getDayOfWeek } from "./dates";

/**
 * Diz se uma atividade deve ocorrer em determinada data ("YYYY-MM-DD"),
 * levando em conta as duas formas de recorrência:
 *  - a cada N dias (intervalDays + startDate)
 *  - em dias fixos da semana (daysOfWeek)
 *
 * É a única fonte de verdade usada pela lista do dia, pelo alerta e pelo
 * contador de atrasos — evita divergência entre as telas.
 */
export function occursOn(task: Task, dateStr: string): boolean {
  if (task.intervalDays && task.startDate) {
    const diff = daysBetween(dateStr, task.startDate);
    return diff >= 0 && diff % task.intervalDays === 0;
  }
  return Array.isArray(task.daysOfWeek) && task.daysOfWeek.includes(getDayOfWeek(dateStr));
}
