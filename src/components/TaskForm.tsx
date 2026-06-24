"use client";

import { useState } from "react";
import DayPicker from "./DayPicker";
import type { TaskFormData } from "@/types";

interface TaskFormProps {
  initial?: TaskFormData;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
}

export default function TaskForm({ initial, onSubmit, onCancel }: TaskFormProps) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [time, setTime] = useState(initial?.time ?? "08:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.daysOfWeek ?? []);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    if (daysOfWeek.length === 0) return;
    setSaving(true);
    try {
      await onSubmit({ description: description.trim(), reason: reason.trim(), time, daysOfWeek });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="desc" className="block text-sm font-medium text-gray-700 mb-1">
          Atividade
        </label>
        <input
          id="desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-input"
          placeholder="O que precisa ser feito?"
          required
        />
      </div>
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
          Motivo / Explicação
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Por que essa atividade é importante?"
          rows={2}
        />
      </div>
      <div>
        <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
          Horário
        </label>
        <input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-input"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dias da Semana
        </label>
        <DayPicker selected={daysOfWeek} onChange={setDaysOfWeek} />
        {daysOfWeek.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Selecione pelo menos um dia</p>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || daysOfWeek.length === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white dark:text-black font-medium py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
