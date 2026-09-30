"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserTasks } from "@/lib/useTasks";
import { getOverdueSummary } from "@/lib/overdue";
import {
  getDayOfWeek,
  nowTimeStr,
  relativeDateLabel,
  todayStr,
  WEEKDAY_LABELS,
} from "@/lib/dates";

interface OverdueBellProps {
  /**
   * Ao clicar numa data em atraso, o dashboard abre esse dia no calendário e
   * leva o usuário direto até a atividade correspondente na lista.
   */
  onOpenActivity?: (date: string, taskId: string) => void;
}

/** Quantas datas mostramos por atividade antes de resumir com "+N". */
const MAX_DATES_SHOWN = 4;

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

export default function OverdueBell({ onOpenActivity }: OverdueBellProps) {
  const { tasks } = useUserTasks();
  const [open, setOpen] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => ({ date: todayStr(), time: nowTimeStr() }));

  // O atraso é recalculado de minuto em minuto: a atividade do dia entra no
  // contador sozinha assim que o horário dela passa.
  useEffect(() => {
    const id = setInterval(() => setNow({ date: todayStr(), time: nowTimeStr() }), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const summary = useMemo(
    () => getOverdueSummary(tasks, now.date, now.time),
    [tasks, now]
  );

  const badge = summary.occurrences > 99 ? "99+" : String(summary.occurrences);

  async function markDone(taskId: string, dates: string[]) {
    if (dates.length === 0) return;
    setSavingKey(taskId);
    setError("");
    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    dates.forEach((date) => {
      updates[`completions.${date}`] = true;
    });
    try {
      await updateDoc(doc(db, "tasks", taskId), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao marcar como feita");
    } finally {
      setSavingKey("");
    }
  }

  function openDate(date: string, taskId: string) {
    onOpenActivity?.(date, taskId);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          summary.occurrences > 0
            ? `Atividades em atraso: ${summary.occurrences}`
            : "Nenhuma atividade em atraso"
        }
        title={
          summary.occurrences > 0
            ? `${summary.occurrences} marcação(ões) em atraso em ${summary.activities.length} atividade(s)`
            : "Nenhuma atividade em atraso"
        }
        className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition cursor-pointer ${
          summary.occurrences > 0
            ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
            : "text-gray-500 hover:text-gray-700 hover:bg-surface-hover"
        }`}
      >
        <BellIcon className="w-4 h-4" />
        {summary.occurrences > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-red-600 text-white dark:text-black text-[0.65rem] font-bold leading-[1.15rem] text-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 cursor-default"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="overdue-title"
            className="relative bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[85vh]"
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    summary.occurrences > 0 ? "bg-red-100" : "bg-green-50"
                  }`}
                >
                  {summary.occurrences > 0 ? (
                    <BellIcon className="w-5 h-5 text-red-600" />
                  ) : (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 id="overdue-title" className="font-bold text-gray-900">
                    {summary.occurrences > 0 ? "Atividades em atraso" : "Nada em atraso"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {summary.occurrences > 0
                      ? `${summary.occurrences} marcação(ões) pendente(s) em ${summary.activities.length} atividade(s)`
                      : "Tudo o que era previsto já foi marcado como feito"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-surface-hover rounded-lg transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {summary.activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">Nenhuma atividade pendente até agora.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Quando algo passar do horário sem marcação, aparece aqui.
                  </p>
                </div>
              ) : (
                summary.activities.map(({ task, dates }) => (
                  <div key={task.id} className="rounded-xl border border-gray-200 bg-surface p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.description}</p>
                        <p className="text-xs text-gray-500">
                          {task.time}
                          {task.intervalDays ? ` · a cada ${task.intervalDays} dias` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => markDone(task.id!, dates)}
                        disabled={savingKey === task.id}
                        className="shrink-0 text-xs font-medium text-green-700 dark:text-green-500 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingKey === task.id ? "Salvando..." : `Concluir ${dates.length}`}
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {dates.slice(0, MAX_DATES_SHOWN).map((date) => (

                        <span
                          key={date}
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 pl-2 pr-1 py-0.5 text-xs text-red-700 dark:text-red-500"
                        >
                          <button
                            type="button"
                            onClick={() => openDate(date, task.id!)}
                            title={`Ir para a atividade de ${date} na lista`}
                            className="cursor-pointer hover:underline"
                          >
                            {WEEKDAY_LABELS[getDayOfWeek(date)]} · {relativeDateLabel(date, now.date)}
                          </button>
                          <button
                            type="button"
                            onClick={() => markDone(task.id!, [date])}
                            disabled={savingKey === task.id}
                            title="Marcar como feita"
                            aria-label={`Marcar ${date} como feita`}
                            className="w-4 h-4 rounded-full bg-green-600 hover:bg-green-700 text-white dark:text-black flex items-center justify-center transition cursor-pointer disabled:opacity-60"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      {dates.length > MAX_DATES_SHOWN && (
                        <span className="text-xs text-gray-500">
                          +{dates.length - MAX_DATES_SHOWN} data(s)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-100 text-xs text-gray-500">
              O contador considera as atividades ativas que passaram do horário sem marcação — inclusive
              hoje. Clique na data para abrir o dia no calendário e ir direto na atividade.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
