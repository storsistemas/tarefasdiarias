"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import ReminderItem from "./ReminderItem";
import ReminderForm from "./ReminderForm";
import type { Reminder, ReminderFormData } from "@/types";

export default function ReminderList() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "done">("pending");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "reminders"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Reminder[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId,
            text: data.text,
            priority: data.priority ?? "normal",
            date: data.date,
            time: data.time ?? "08:00",
            remindValue: data.remindValue ?? 0,
            remindUnit: data.remindUnit ?? "minutos",
            resolved: data.resolved ?? false,
            active: data.active ?? true,
            createdAt: data.createdAt?.toDate() ?? new Date(),
          });
        });
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        setReminders(list);
        setLoading(false);
      },
      (err) => {
        console.error("Reminders error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  async function handleCreate(data: ReminderFormData) {
    if (!user) return;
    await addDoc(collection(db, "reminders"), {
      userId: user.uid,
      text: data.text,
      priority: data.priority,
      date: data.date,
      time: data.time,
      remindValue: data.remindValue,
      remindUnit: data.remindUnit,
      resolved: false,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowForm(false);
  }

  const pending = reminders.filter((r) => !r.resolved);
  const done = reminders.filter((r) => r.resolved);
  const displayed = tab === "pending" ? pending : done;

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Lembretes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white dark:text-black font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          {showForm ? "Cancelar" : "+ Adicionar"}
        </button>
      </div>

      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 text-sm font-medium py-2.5 text-center transition cursor-pointer ${
            tab === "pending"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pendentes
          {pending.length > 0 && (
            <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{pending.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("done")}
          className={`flex-1 text-sm font-medium py-2.5 text-center transition cursor-pointer ${
            tab === "done"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Concluídos
          {done.length > 0 && (
            <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{done.length}</span>
          )}
        </button>
      </div>

      {showForm && (
        <div className="p-4 border-b border-gray-100">
          <ReminderForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : displayed.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">
            {tab === "pending" ? "Nenhum lembrete pendente" : "Nenhum lembrete concluído"}
          </p>
        ) : (
          displayed.map((r) => (
            <ReminderItem key={r.id} reminder={r} onUpdate={() => {}} />
          ))
        )}
      </div>
    </div>
  );
}
