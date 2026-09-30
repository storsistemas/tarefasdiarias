"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { db } from "./firebase";
import { toTask } from "./mappers";
import type { Task } from "@/types";

/**
 * Assina em tempo real as atividades do usuário logado.
 * Centraliza a consulta usada pela lista, pelo alerta e pelo contador de atrasos.
 */
export function useUserTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Task[] = [];
        snap.forEach((d) => list.push(toTask(d.id, d.data())));
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setTasks(list);
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error("Tasks error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { tasks, loading, error };
}
