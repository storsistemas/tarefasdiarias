import type { DocumentData } from "firebase/firestore";
import type { Priority, Reminder, RemindUnit, Task } from "@/types";

/** Converte um documento do Firestore em Task, aplicando os defaults do app. */
export function toTask(id: string, data: DocumentData): Task {
  return {
    id,
    userId: data.userId,
    description: data.description ?? "",
    reason: data.reason ?? "",
    time: data.time ?? "",
    daysOfWeek: data.daysOfWeek ?? [],
    intervalDays: data.intervalDays ?? null,
    startDate: data.startDate ?? "",
    active: data.active ?? true,
    alertEnabled: data.alertEnabled ?? false,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    completions: data.completions ?? {},
  };
}

/** Converte um documento do Firestore em Reminder, aplicando os defaults do app. */
export function toReminder(id: string, data: DocumentData): Reminder {
  return {
    id,
    userId: data.userId,
    text: data.text ?? "",
    priority: (data.priority ?? "normal") as Priority,
    date: data.date ?? "",
    time: data.time ?? "08:00",
    remindValue: data.remindValue ?? 0,
    remindUnit: (data.remindUnit ?? "minutos") as RemindUnit,
    resolved: data.resolved ?? false,
    active: data.active ?? true,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}
