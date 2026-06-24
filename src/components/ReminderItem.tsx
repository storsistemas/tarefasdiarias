"use client";

import { useState } from "react";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ReminderForm from "./ReminderForm";
import type { Reminder, ReminderFormData } from "@/types";

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
  const [editing, setEditing] = useState(false);

  async function toggleResolved() {
    const ref = doc(db, "reminders", reminder.id!);
    await updateDoc(ref, {
      resolved: !reminder.resolved,
      updatedAt: serverTimestamp(),
    });
    onUpdate();
  }

  async function handleEdit(data: ReminderFormData) {
    const ref = doc(db, "reminders", reminder.id!);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    setEditing(false);
    onUpdate();
  }

  async function handleToggleActive() {
    const ref = doc(db, "reminders", reminder.id!);
    await updateDoc(ref, {
      active: !reminder.active,
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

  function remindLabel(): string {
    return `${reminder.remindValue} ${reminder.remindUnit} antes`;
  }

  if (editing) {
    return (
      <div className="bg-surface rounded-lg border border-gray-200 p-3">
        <ReminderForm
          initial={{
            text: reminder.text,
            priority: reminder.priority,
            date: reminder.date,
            time: reminder.time,
            remindValue: reminder.remindValue,
            remindUnit: reminder.remindUnit,
          }}
          onSubmit={handleEdit}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition ${
        reminder.resolved
          ? "bg-gray-50 border-gray-200 opacity-60"
          : !reminder.active
          ? "bg-gray-50 border-gray-200 opacity-50"
          : reminder.priority === "urgente"
          ? "bg-red-50 border-red-200"
          : "bg-surface border-gray-200"
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
        {!reminder.active && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">Inativo</span>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pStyle.class}`}>
            {pStyle.label}
          </span>
          <span className="text-xs text-gray-400">
            {reminder.date} às {reminder.time}
          </span>
          <span className="text-xs text-amber-500 font-medium">
            ⏰ {remindLabel()}
          </span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
          title="Editar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={handleToggleActive}
          className="p-1 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition cursor-pointer"
          title={reminder.active ? "Inativar" : "Ativar"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
          title="Excluir"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
