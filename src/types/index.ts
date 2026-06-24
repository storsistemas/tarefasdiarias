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
