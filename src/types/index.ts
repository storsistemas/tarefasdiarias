export interface Task {
  id?: string;
  userId: string;
  description: string;
  reason: string;
  time: string;
  daysOfWeek: number[];
  intervalDays: number | null;
  startDate: string;
  active: boolean;
  alertEnabled: boolean;
  createdAt: Date;
  completions: Record<string, boolean>;
}

export interface TaskFormData {
  description: string;
  reason: string;
  time: string;
  daysOfWeek: number[];
  intervalDays: number | null;
  startDate: string;
}

export type Priority = "baixo" | "normal" | "urgente";
export type RemindUnit = "minutos" | "horas" | "dias";

export interface Reminder {
  id?: string;
  userId: string;
  text: string;
  priority: Priority;
  date: string;
  time: string;
  remindValue: number;
  remindUnit: RemindUnit;
  resolved: boolean;
  active: boolean;
  createdAt: Date;
}

export interface ReminderFormData {
  text: string;
  priority: Priority;
  date: string;
  time: string;
  remindValue: number;
  remindUnit: RemindUnit;
}
