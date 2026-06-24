"use client";

import { useState } from "react";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import TaskForm from "./TaskForm";
import type { Task, TaskFormData } from "@/types";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface TaskItemProps {
  task: Task;
  selectedDate: string;
  onUpdate: () => void;
}

export default function TaskItem({ task, selectedDate, onUpdate }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const today = selectedDate;
  const isCompleted = task.completions?.[today] === true;

  async function toggleComplete() {
    const ref = doc(db, "tasks", task.id!);
    const updates: Record<string, unknown> = {};
    if (isCompleted) {
      updates[`completions.${today}`] = false;
    } else {
      updates[`completions.${today}`] = true;
    }
    updates.updatedAt = serverTimestamp();
    await updateDoc(ref, updates);
    onUpdate();
  }

  async function handleEdit(data: TaskFormData) {
    const ref = doc(db, "tasks", task.id!);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    setEditing(false);
    onUpdate();
  }

  async function handleDelete() {
    if (!confirm("Excluir esta atividade?")) return;
    await deleteDoc(doc(db, "tasks", task.id!));
    onUpdate();
  }

  async function handleToggleActive() {
    const ref = doc(db, "tasks", task.id!);
    await updateDoc(ref, {
      active: !task.active,
      updatedAt: serverTimestamp(),
    });
    onUpdate();
  }

  if (editing) {
    return (
      <div className="bg-surface rounded-xl border border-gray-200 p-4">
        <TaskForm
          initial={{
            description: task.description,
            reason: task.reason,
            time: task.time,
            daysOfWeek: task.daysOfWeek,
          }}
          onSubmit={handleEdit}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={`bg-surface rounded-xl border p-4 transition ${
        !task.active ? "border-gray-200 opacity-50" : isCompleted ? "border-green-200 bg-green-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={toggleComplete}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${isCompleted ? "line-through text-gray-400" : "text-gray-900"}`}>
              {task.description}
            </h3>
            {!task.active && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativa</span>
            )}
          </div>
          {task.reason && <p className="text-sm text-gray-500 mt-1">{task.reason}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {task.time}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {task.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ")}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleToggleActive}
            className="p-1.5 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition cursor-pointer"
            title={task.active ? "Inativar" : "Ativar"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
            title="Excluir"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
