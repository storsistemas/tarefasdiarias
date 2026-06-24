"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthProvider, { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import TaskList from "@/components/TaskList";
import ReminderList from "@/components/ReminderList";
import ReminderAlert from "@/components/ReminderAlert";
import Calendar from "@/components/Calendar";
import { formatDate } from "@/lib/dates";

function DashboardContent() {
  const { user, loading } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  const dateObj = new Date(selectedDate + "T12:00:00");
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
      <ReminderAlert />
      <header className="bg-surface shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Tarefas Diárias</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              {user.displayName || user.email}
            </span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-3 py-1.5 rounded-lg transition cursor-pointer"
              title={dark ? "Modo claro" : "Modo escuro"}
            >
              {dark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-4">
            <div className="bg-surface rounded-xl shadow-sm border border-gray-200 p-4">
              <Calendar selectedDate={selectedDate} onSelect={setSelectedDate} />
            </div>
            <div className="bg-surface rounded-xl shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-lg font-semibold text-gray-900">{dayNames[dateObj.getDay()]}</p>
              <p className="text-sm text-gray-500">
                {dateObj.getDate()} de {monthNames[dateObj.getMonth()]} de {dateObj.getFullYear()}
              </p>
            </div>
            <ReminderList />
          </div>
          <div>
            <TaskList selectedDate={selectedDate} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
