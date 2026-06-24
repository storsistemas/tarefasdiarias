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
            resolved: data.resolved ?? false,
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
      resolved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowForm(false);
  }

  const unresolved = reminders.filter((r) => !r.resolved);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Lembretes
          {unresolved.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({unresolved.length} pendentes)</span>
          )}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          {showForm ? "Cancelar" : "+ Lembrete"}
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">Nenhum lembrete</p>
        ) : (
          reminders.map((r) => (
            <ReminderItem key={r.id} reminder={r} onUpdate={() => {}} />
          ))
        )}
      </div>
    </div>
  );
}
