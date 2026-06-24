"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import type { Reminder } from "@/types";

const UNIT_MS: Record<string, number> = {
  minutos: 60 * 1000,
  horas: 60 * 60 * 1000,
  dias: 24 * 60 * 60 * 1000,
};

function getAlertTime(r: Reminder): Date {
  const [h, m] = r.time.split(":").map(Number);
  const event = new Date(r.date + "T" + r.time);
  const offset = r.remindValue * (UNIT_MS[r.remindUnit] ?? 0);
  return new Date(event.getTime() - offset);
}

export default function ReminderAlert() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [alertedIds, setAlertedIds] = useState<Set<string>>(new Set());
  const [activeAlerts, setActiveAlerts] = useState<Reminder[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "reminders"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
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
      setReminders(list);
    });
    return () => unsub();
  }, [user]);

  const checkAlerts = useCallback(() => {
    const now = Date.now();
    const due = reminders.filter((r) => {
      if (!r.active || r.resolved || alertedIds.has(r.id!)) return false;
      const alertAt = getAlertTime(r).getTime();
      return alertAt <= now;
    });
    setActiveAlerts(due);
  }, [reminders, alertedIds]);

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 30_000);
    return () => clearInterval(interval);
  }, [checkAlerts]);

  async function dismiss(id: string) {
    setAlertedIds(new Set(alertedIds).add(id));
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function resolveAndDismiss(id: string) {
    setAlertedIds(new Set(alertedIds).add(id));
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
    await updateDoc(doc(db, "reminders", id), {
      resolved: true,
      updatedAt: serverTimestamp(),
    });
  }

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {activeAlerts.map((r) => {
        const isUrgent = r.priority === "urgente";
        return (
          <div
            key={r.id}
            className={`rounded-xl shadow-lg p-4 text-white ${
              isUrgent ? "bg-red-600" : r.priority === "normal" ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-sm">{isUrgent ? "Lembrete Urgente!" : "Lembrete"}</p>
                <p className={`text-sm mt-1 ${isUrgent ? "text-red-100" : "text-white/90"}`}>{r.text}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => dismiss(r.id!)}
                  className="text-white/70 hover:text-white p-1 cursor-pointer"
                  title="Fechar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={() => resolveAndDismiss(r.id!)}
                  className="text-white/70 hover:text-white p-1 cursor-pointer"
                  title="Marcar resolvido"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
