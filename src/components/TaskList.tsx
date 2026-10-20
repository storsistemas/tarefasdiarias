"use client";

import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { toTask } from "@/lib/mappers";
import { occursOn } from "@/lib/recurrence";
import TaskItem from "./TaskItem";
import TaskForm from "./TaskForm";
import type { Task, TaskFormData } from "@/types";

/** Chave de ordenação manual de uma tarefa em um dia específico. */
function sortKey(task: Task, date: string) {
  return task.sortOrders?.[date] ?? Number.MAX_SAFE_INTEGER;
}

/** Ordena pela posição manual do dia e usa createdAt como desempate. */
function compareTasks(a: Task, b: Task, date: string) {
  const ra = sortKey(a, date);
  const rb = sortKey(b, date);
  if (ra !== rb) return ra - rb;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

interface TaskListProps {
  selectedDate: string;
  /** Atividade que deve receber o destaque (vinda do painel de atrasos). */
  focusTaskId?: string | null;
  /** Muda a cada clique, permitindo focar a mesma atividade de novo. */
  focusNonce?: number;
}

export default function TaskList({ selectedDate, focusTaskId = null, focusNonce = 0 }: TaskListProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const pendingListRef = useRef<HTMLDivElement>(null);

  // Rola até a atividade escolhida no painel de atrasos e a destaca por alguns
  // segundos. Tenta algumas vezes porque a lista do dia pode chegar depois
  // (a assinatura do Firestore é assíncrona).
  useEffect(() => {
    const target = focusTaskId;
    if (!target) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function focus() {
      if (cancelled) return;
      const el = document.getElementById(`task-${target}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(target);
        timer = setTimeout(() => {
          if (!cancelled) setHighlightId(null);
        }, 2600);
        return;
      }
      if (attempts++ < 12) timer = setTimeout(focus, 100);
    }

    timer = setTimeout(focus, 0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [focusTaskId, focusNonce, selectedDate]);

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
        snap.forEach((d) => list.push(toTask(d.id, d.data())));
        list.sort((a, b) => compareTasks(a, b, selectedDate));
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
  }, [user, selectedDate]);

  const filteredTasks = tasks.filter((t) => !t.active || occursOn(t, selectedDate));

  const completedTasks = filteredTasks.filter((t) => t.completions?.[selectedDate] === true);
  const pendingTasks = filteredTasks
    .filter((t) => {
      if (!t.active) return false;
      return t.completions?.[selectedDate] !== true;
    })
    .sort((a, b) => compareTasks(a, b, selectedDate));
  const inactiveTasks = filteredTasks.filter((t) => !t.active);

  async function handleCreate(data: TaskFormData) {
    if (!user) return;
    await addDoc(collection(db, "tasks"), {
      userId: user.uid,
      description: data.description,
      reason: data.reason,
      time: data.time,
      daysOfWeek: data.daysOfWeek,
      intervalDays: data.intervalDays,
      startDate: data.startDate,
      active: true,
      alertEnabled: false,
      completions: {},
      sortOrders: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowForm(false);
  }

  /** Persiste a nova ordem dos pendentes do dia no Firestore (lote único). */
  async function persistOrder(ordered: Task[]) {
    if (!user) return;
    const batch = writeBatch(db);
    ordered.forEach((task, index) => {
      if (task.id == null) return;
      batch.update(doc(db, "tasks", task.id), {
        [`sortOrders.${selectedDate}`]: index,
        updatedAt: serverTimestamp(),
      });
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error("Erro ao salvar a ordem:", err);
    }
  }

  /** Move o pendente de `fromIndex` para `toIndex` (usado pelos botões ↑/↓). */
  function moveTaskByIndex(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= pendingTasks.length || fromIndex === toIndex) return;
    const next = [...pendingTasks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    applyOrder(next);
  }

  /** Atualiza o estado local com a nova ordem. */
  function updateLocalOrder(ordered: Task[]) {
    const positions = new Map(ordered.map((task, index) => [task.id, index]));
    setTasks((prev) =>
      prev.map((task) => {
        const index = positions.get(task.id);
        if (index == null || task.sortOrders?.[selectedDate] === index) return task;
        return { ...task, sortOrders: { ...task.sortOrders, [selectedDate]: index } };
      })
    );
  }

  /** Atualiza o estado local com a nova ordem e grava no Firestore. */
  function applyOrder(ordered: Task[]) {
    updateLocalOrder(ordered);
    void persistOrder(ordered);
  }

  /**
   * Inicia o arraste do card com pointer events (funciona com mouse e toque).
   * Reordena ao vivo enquanto o dedo/mouse cruza outros cards; grava ao soltar.
   */
  function startDrag(taskId: string, e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();

    const startY = e.clientY;
    let active = false;
    const currentOrder: Task[] = [...pendingTasks];

    const cardRects = () => {
      const list = pendingListRef.current;
      if (!list) return [];
      return Array.from(list.querySelectorAll<HTMLElement>("[data-task-id]")).map((el) => ({
        id: el.dataset.taskId ?? "",
        top: el.getBoundingClientRect().top,
        height: el.getBoundingClientRect().height,
      }));
    };
    let rects = cardRects();

    const reorderTo = (clientY: number) => {
      const from = currentOrder.findIndex((t) => t.id === taskId);
      if (from < 0) return;
      let to = from;
      rects.forEach((rect, index) => {
        if (index === from) return;
        const mid = rect.top + rect.height / 2;
        if (clientY > mid && index < from) to = Math.max(to, index);
        if (clientY < mid && index > from) to = Math.min(to, index);
      });
      if (to === from) return;
      const next = [...currentOrder];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      currentOrder.splice(0, currentOrder.length, ...next);
      updateLocalOrder(currentOrder);
      // Recalcula as posições dos cards depois do reflow.
      requestAnimationFrame(() => {
        rects = cardRects();
      });
    };

    const onMove = (ev: PointerEvent) => {
      if (!active) {
        if (Math.abs(ev.clientY - startY) < 6) return;
        active = true;
        setDraggingId(taskId);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
        rects = cardRects();
      }
      reorderTo(ev.clientY);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (active) {
        setDraggingId(null);
        void persistOrder(currentOrder);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-500 mt-3">Carregando atividades...</p>
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
          className="bg-blue-600 hover:bg-blue-700 text-white dark:text-black text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer"
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
          <div
            ref={pendingListRef}
            className="space-y-2"
          >
            {pendingTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                selectedDate={selectedDate}
                onUpdate={() => {}}
                highlighted={highlightId === task.id}
                reorderable
                isDragging={draggingId === task.id}
                onPointerDown={(e) => startDrag(task.id!, e)}
                onMoveUp={index > 0 ? () => moveTaskByIndex(index, index - 1) : undefined}
                onMoveDown={
                  index < pendingTasks.length - 1 ? () => moveTaskByIndex(index, index + 1) : undefined
                }
              />
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
              <TaskItem
                key={task.id}
                task={task}
                selectedDate={selectedDate}
                onUpdate={() => {}}
                highlighted={highlightId === task.id}
              />
            ))}
          </div>
        </div>
      )}

      {inactiveTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Inativas ({inactiveTasks.length})</h3>
          <div className="space-y-2">
            {inactiveTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                selectedDate={selectedDate}
                onUpdate={() => {}}
                highlighted={highlightId === task.id}
              />
            ))}
          </div>
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
