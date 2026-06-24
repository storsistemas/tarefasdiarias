"use client";

import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Reminder } from "@/types";

interface ReminderItemProps {
  reminder: Reminder;
  onUpdate: () => void;
}

const PRIORITY_STYLES: Record<string, { label: string; class: string }> = {
  baixo: { label: "Baixo", class: "bg-gray-100 text-gray-600" },
  normal: { label: "Normal", class: "bg-blue-100 text-blue-700" },
  urgente: { label: "Urgente", class: "bg-red-100 text-red-700" },
};

export default function ReminderItem({ reminder, onUpdate }: ReminderItemProps) {
  async function toggleResolved() {
    const ref = doc(db, "reminders", reminder.id!);
    await updateDoc(ref, {
      resolved: !reminder.resolved,
      updatedAt: serverTimestamp(),
    });
    onUpdate();
  }

  async function handleDelete() {
    if (!confirm("Excluir este lembrete?")) return;
    await deleteDoc(doc(db, "reminders", reminder.id!));
    onUpdate();
  }

  const pStyle = PRIORITY_STYLES[reminder.priority] ?? PRIORITY_STYLES.normal;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition ${
        reminder.resolved
          ? "bg-gray-50 border-gray-200 opacity-60"
          : reminder.priority === "urgente"
          ? "bg-red-50 border-red-200"
          : "bg-white border-gray-200"
      }`}
    >
      <input
        type="checkbox"
        checked={reminder.resolved}
        onChange={toggleResolved}
        className="mt-0.5 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${reminder.resolved ? "line-through text-gray-400" : "text-gray-900"}`}>
          {reminder.text}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pStyle.class}`}>
            {pStyle.label}
          </span>
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
        title="Excluir"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
