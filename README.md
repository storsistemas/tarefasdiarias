# Tarefas Diárias

Aplicação web (PWA-ready) para gerenciar **atividades recorrentes** e **lembretes**
do dia a dia: cada atividade pode repetir em dias fixos da semana ou a cada N dias,
dispara alerta na hora marcada (modal + som) e tem histórico de conclusão por data.
Um **sino no cabeçalho** mostra quantas marcações ficaram em atraso e permite
concluí-las direto do painel; clicar numa data em atraso abre aquele dia e leva
a lista direto até a atividade correspondente (com destaque temporário).

- Produção: https://storsistemas.github.io/tarefasdiarias/
- Repositório: https://github.com/storsistemas/tarefasdiarias
- Projeto Firebase: `multiplicadores-stor` (Firestore + Auth, compartilhado com o app Multiplicadores Stor)

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) com `output: "export"` (site estático) |
| UI | React 19 + Tailwind CSS 4 (`src/app/globals.css`, tema claro/escuro via CSS vars) |
| Auth | Firebase Authentication (e-mail/senha) |
| Dados | Cloud Firestore (SDK web `firebase` 12) |
| Deploy | GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`) |

## Estrutura

```
src/
  app/
    layout.tsx        # layout raiz + ThemeProvider
    page.tsx          # redireciona para /dashboard ou /login
    login/page.tsx    # login (e-mail/senha)
    cadastro/page.tsx # cria conta + doc em /users/{uid}
    dashboard/page.tsx# cabeçalho, calendário, atividades e lembretes
    globals.css       # tokens de tema (claro/escuro) + Tailwind
  components/
    AuthProvider.tsx     # contexto de usuário (onAuthStateChanged)
    ThemeProvider.tsx    # tema claro/escuro persistido em localStorage
    Calendar.tsx         # seletor de data (mês/dia)
    DayPicker.tsx        # dias da semana
    TaskList.tsx         # lista + criação de atividades
    TaskItem.tsx         # concluir / editar / inativar / alerta / excluir
    TaskForm.tsx         # formulário de atividade (semanal ou a cada N dias)
    TaskAlertWatcher.tsx # observa as atividades e dispara alerta na hora
    ReminderList.tsx     # abas Pendentes/Concluídos + criação de lembretes
    ReminderItem.tsx     # concluir / editar / inativar / excluir
    ReminderForm.tsx     # formulário de lembrete (prioridade e antecedência)
    ReminderAlert.tsx    # toasts de lembrete no horário configurado
    OverdueBell.tsx      # sino + contador de atraso (clicar na data leva à atividade do dia)
  lib/
    firebase.ts       # inicialização do Firebase (auth + db)
    dates.ts          # helpers de data (hoje, dia da semana, diferença em dias)
    recurrence.ts     # occursOn(): regra de recorrência (semanal / a cada N dias)
    overdue.ts        # cálculo das datas em atraso e resumo por atividade
    mappers.ts        # toTask()/toReminder(): documentos do Firestore -> tipos do app
    useTasks.ts       # useUserTasks(): assina as atividades do usuário em tempo real
  types/index.ts      # tipos Task / Reminder
```

## Modelo de dados (Firestore)

- `/users/{uid}` — `{ name, email, createdAt }` (criado em `cadastro/page.tsx`)
- `/tasks/{taskId}` — `{ userId, description, reason, time, daysOfWeek[], intervalDays, startDate, active, alertEnabled, completions: { "YYYY-MM-DD": true }, createdAt, updatedAt }`
- `/reminders/{reminderId}` — `{ userId, text, priority, date, time, remindValue, remindUnit, resolved, active, createdAt, updatedAt }`

Regra de recorrência: se `intervalDays` e `startDate` estiverem preenchidos, a atividade
aparece quando `(dataSelecionada - startDate) % intervalDays === 0`; caso contrário
aparece nos dias de `daysOfWeek` (implementado uma única vez em `src/lib/recurrence.ts`
e usado pela lista do dia, pelo alerta e pelo contador de atrasos).

### Contador de atrasos (sino)

O sino no cabeçalho conta as **marcações pendentes**: para cada atividade **ativa**,
percorre as datas em que ela estava prevista desde a maior data entre a criação e o
início da recorrência até agora, e conta as que não têm `completions[data] === true`.
O dia de hoje só entra depois do horário da atividade. O painel permite concluir
uma data, concluir todas as datas daquela atividade e **ir direto para a atividade**:
clicar na data abre aquele dia no calendário e a lista rola até a atividade
correspondente, destacada por alguns segundos (âncora `#task-{id}` no `TaskItem`).

Todas as consultas usam apenas um filtro (`where("userId", "==", uid)`), portanto
**não é necessário índice composto** no Firestore.

## Segurança

As regras do Firestore ficam em [`firestore.rules`](./firestore.rules) (publicação
manual pelo Console ou via `firebase deploy --only firestore:rules`, ver `firebase.json`).
Cada usuário só lê/escreve documentos cujo `userId` seja igual ao próprio `uid`.

> ⚠️ A chave de API do Firebase é pública por natureza (fica no bundle), mas as
> **regras do Firestore são o que realmente protege os dados** — confirme sempre que
> elas estão publicadas em Firestore Database > Regras.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # ESLint (eslint-config-next)
npm run build    # gera o site estático em out/
npm start        # serve o out/ localmente (npx serve out)
```

O app é publicado com `basePath` `/tarefasdiarias` (ver `next.config.ts`), então em
desenvolvimento a URL correta é `http://localhost:3000/tarefasdiarias`.

## Deploy

Qualquer push na branch `main` dispara o workflow
[`deploy.yml`](./.github/workflows/deploy.yml), que roda `npm ci`, `npm run build`
e publica a pasta `out/` no GitHub Pages.

## Próximos passos

O backlog priorizado de melhorias (segurança, produto e qualidade de código) está em
[`docs/PLANO-MELHORIAS.md`](./docs/PLANO-MELHORIAS.md).


