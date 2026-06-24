"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { getDayOfWeek } from "@/lib/dates";
import TaskItem from "./TaskItem";
import TaskForm from "./TaskForm";
import type { Task, TaskFormData } from "@/types";

interface TaskListProps {
  selectedDate: string;
}

export default function TaskList({ selectedDate }: TaskListProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dayOfWeek = getDayOfWeek(selectedDate);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
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
            active: data.active ?? true,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            completions: data.completions ?? {},
          });
        });
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("Erro ao carregar atividades: " + err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const filteredTasks = tasks.filter((t) => {
    if (!t.active) return true;
    return t.daysOfWeek.includes(dayOfWeek);
  });

  const completedTasks = filteredTasks.filter((t) => t.completions?.[selectedDate] === true);
  const pendingTasks = filteredTasks.filter((t) => {
    if (!t.active) return false;
    return t.completions?.[selectedDate] !== true;
  });
  const inactiveTasks = filteredTasks.filter((t) => !t.active);

  async function handleCreate(data: TaskFormData) {
    if (!user) return;
    await addDoc(collection(db, "tasks"), {
      userId: user.uid,
      description: data.description,
      reason: data.reason,
      time: data.time,
      daysOfWeek: data.daysOfWeek,
      active: true,
      completions: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-400 mt-3">Carregando atividades...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-sm text-red-500 mt-2">
          Verifique se o Firestore está ativo no Firebase Console e as regras de segurança permitem acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Atividades
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({filteredTasks.length})
          </span>
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer"
        >
          {showForm ? "Cancelar" : "+ Nova Atividade"}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-xl border border-gray-200 p-4">
          <TaskForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {pendingTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pendentes ({pendingTasks.length})
          </h3>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} selectedDate={selectedDate} onUpdate={() => {}} />
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Concluídas ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} selectedDate={selectedDate} onUpdate={() => {}} />
            ))}
          </div>
        </div>
      )}

      {inactiveTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Inativas ({inactiveTasks.length})</h3>
          <div className="space-y-2">
            {inactiveTasks.map((task) => (
              <TaskItem key={task.id} task={task} selectedDate={selectedDate} onUpdate={() => {}} />
            ))}
          </div>
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>Nenhuma atividade para este dia</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 cursor-pointer"
          >
            Criar primeira atividade
          </button>
        </div>
      )}
    </div>
  );
}
