"use client";

import { useState } from "react";
import { todayStr } from "@/lib/dates";
import type { ReminderFormData, Priority, RemindUnit } from "@/types";

interface ReminderFormProps {
  initial?: ReminderFormData;
  onSubmit: (data: ReminderFormData) => Promise<void>;
  onCancel: () => void;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "baixo", label: "Baixo", color: "bg-gray-100 text-gray-600" },
  { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-700" },
  { value: "urgente", label: "Urgente", color: "bg-red-100 text-red-700" },
];

const REMIND_UNITS: { value: RemindUnit; label: string }[] = [
  { value: "minutos", label: "Minutos antes" },
  { value: "horas", label: "Horas antes" },
  { value: "dias", label: "Dias antes" },
];

export default function ReminderForm({ initial, onSubmit, onCancel }: ReminderFormProps) {
  const [text, setText] = useState(initial?.text ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "normal");
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [time, setTime] = useState(initial?.time ?? "08:00");
  const [remindValue, setRemindValue] = useState(initial?.remindValue ?? 30);
  const [remindUnit, setRemindUnit] = useState<RemindUnit>(initial?.remindUnit ?? "minutos");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ text: text.trim(), priority, date, time, remindValue, remindUnit });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="reminder-text" className="block text-sm font-medium text-gray-700 mb-1">
          Lembrete
        </label>
        <input
          id="reminder-text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="Digite seu lembrete..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                priority === p.value
                  ? p.value === "urgente" ? "bg-red-600 text-white"
                    : p.value === "normal" ? "bg-blue-600 text-white"
                    : "bg-gray-600 text-white"
                  : p.color + " hover:opacity-80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reminder-date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            id="reminder-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
          <input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Me lembre</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={365}
            value={remindValue}
            onChange={(e) => setRemindValue(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
          />
          <select
            value={remindUnit}
            onChange={(e) => setRemindUnit(e.target.value as RemindUnit)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            {REMIND_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
