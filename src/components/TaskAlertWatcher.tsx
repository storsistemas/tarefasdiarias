"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { todayStr, getDayOfWeek, daysBetween } from "@/lib/dates";
import type { Task } from "@/types";

interface AlertTask {
  id: string;
  description: string;
  time: string;
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.3;

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 523.25;
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 659.25;
    osc2.connect(gain);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.4);

    const osc3 = ctx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.value = 783.99;
    osc3.connect(gain);
    osc3.start(now + 0.3);
    osc3.stop(now + 0.7);

    const envGain = ctx.createGain();
    envGain.connect(ctx.destination);
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    envGain.gain.linearRampToValueAtTime(0.2, now + 0.4);
    envGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    const oscA = ctx.createOscillator();
    oscA.type = "triangle";
    oscA.frequency.value = 440;
    oscA.connect(envGain);
    oscA.start(now);
    oscA.stop(now + 1.2);
  } catch {
  }
}

export default function TaskAlertWatcher() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertTask[]>([]);
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list: Task[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          userId: data.userId,
          description: data.description,
          reason: data.reason ?? "",
          time: data.time,
          daysOfWeek: data.daysOfWeek ?? [],
          intervalDays: data.intervalDays ?? null,
          startDate: data.startDate ?? "",
          active: data.active ?? true,
          alertEnabled: data.alertEnabled ?? false,
          createdAt: data.createdAt?.toDate() ?? new Date(),
          completions: data.completions ?? {},
        });
      });
      setTasks(list);
    });
    return () => unsub();
  }, [user]);

  const today = todayStr();
  const dayOfWeek = getDayOfWeek(today);

  const shouldAlertToday = useCallback((task: Task) => {
    if (!task.active || !task.alertEnabled) return false;
    if (task.completions?.[today] === true) return false;
    if (task.intervalDays && task.startDate) {
      const diff = daysBetween(today, task.startDate);
      return diff >= 0 && diff % task.intervalDays === 0;
    }
    return task.daysOfWeek.includes(dayOfWeek);
  }, [today, dayOfWeek]);

  const checkAlerts = useCallback(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const due = tasks.filter((t) => {
      if (!shouldAlertToday(t)) return false;
      if (alertedRef.current.has(t.id!)) return false;
      return t.time === currentTime;
    });

    if (due.length > 0) {
      const alertTasks: AlertTask[] = due.map((t) => ({
        id: t.id!,
        description: t.description,
        time: t.time,
      }));

      alertTasks.forEach((a) => alertedRef.current.add(a.id));
      setActiveAlerts((prev) => [...prev, ...alertTasks]);
      playChime();
    }
  }, [tasks, shouldAlertToday]);

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 30_000);
    return () => clearInterval(interval);
  }, [checkAlerts]);

  function dismissAlert(id: string) {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function dismissAll() {
    setActiveAlerts([]);
  }

  return (
    <>
      {activeAlerts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-900">Hora da Atividade!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">Você tem atividades pendentes</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-900">{alert.description}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-200 px-1.5 py-0.5 rounded">
                      {alert.time}
                    </span>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-600 p-1 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={dismissAll}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white dark:text-black font-medium py-2 rounded-lg transition cursor-pointer"
            >
              Fechar alertas
            </button>
          </div>
        </div>
      )}
    </>
  );
}
