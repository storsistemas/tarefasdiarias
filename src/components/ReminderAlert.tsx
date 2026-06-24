"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { todayStr } from "@/lib/dates";
import type { Reminder } from "@/types";

export default function ReminderAlert() {
  const { user } = useAuth();
  const [urgent, setUrgent] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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
          resolved: data.resolved ?? false,
          createdAt: data.createdAt?.toDate() ?? new Date(),
        });
      });
      const today = todayStr();
      const active = list.filter(
        (r) => !r.resolved && r.date === today && r.priority === "urgente" && !dismissed.has(r.id!)
      );
      setUrgent(active);
    });
    return () => unsub();
  }, [user, dismissed]);

  if (urgent.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {urgent.map((r) => (
        <div
          key={r.id}
          className="bg-red-600 text-white rounded-xl shadow-lg p-4 animate-in slide-in-from-right duration-300"
        >
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-sm">Lembrete Urgente!</p>
              <p className="text-sm text-red-100 mt-1">{r.text}</p>
            </div>
            <button
              onClick={async () => {
                setDismissed(new Set(dismissed).add(r.id!));
                await updateDoc(doc(db, "reminders", r.id!), {
                  resolved: true,
                  updatedAt: serverTimestamp(),
                });
              }}
              className="text-white/80 hover:text-white p-1 cursor-pointer"
              title="Resolver"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
