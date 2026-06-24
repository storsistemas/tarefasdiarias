export interface Task {
  id?: string;
  userId: string;
  description: string;
  reason: string;
  time: string;
  daysOfWeek: number[];
  active: boolean;
  createdAt: Date;
  completions: Record<string, boolean>;
}

export interface TaskFormData {
  description: string;
  reason: string;
  time: string;
  daysOfWeek: number[];
}

export type Priority = "baixo" | "normal" | "urgente";

export interface Reminder {
  id?: string;
  userId: string;
  text: string;
  priority: Priority;
  date: string;
  resolved: boolean;
  createdAt: Date;
}

export interface ReminderFormData {
  text: string;
  priority: Priority;
  date: string;
}
