# Plano de melhorias — Tarefas Diárias

Diagnóstico feito em 30/09/2026 a partir do código em `C:\Storagentes\Suporte\tarefasdiarias`
(Next.js 16 + React 19 + Firebase Auth/Firestore, deploy estático no GitHub Pages).

Legenda de prioridade: **P0** = risco imediato, **P1** = desbloqueia o trabalho,
**P2** = produto, **P3** = qualidade/UX.

## Entregue em 30/09/2026

- **Sino de atrasos no cabeçalho** (`src/components/OverdueBell.tsx`): badge vermelho com a
  quantidade de marcações pendentes, painel listando as atividades em atraso, botão
  "Concluir N" por atividade, "✓" por data e atalho para abrir o dia no calendário.
- Lógica pura e testada em `src/lib/overdue.ts` (14 casos verificados com dados simulados);
  regra de recorrência unificada em `src/lib/recurrence.ts`; conversão de documentos
  centralizada em `src/lib/mappers.ts`; assinatura em tempo real em `src/lib/useTasks.ts`.
- `firestore.rules` + `firebase.json` (regras por proprietário) e README documentado.

---

## P0 — Segurança (fazer antes de qualquer feature)

1. **Regras do Firestore estão abertas (crítico).**
   Testado via REST (`firestore.googleapis.com`) com a apiKey pública do bundle:
   - leitura **sem autenticação** funcionou nas coleções `tasks`, `reminders`, `users`, `usuarios`;
   - escrita/remoção **sem autenticação** também funcionou (documento de teste criado e removido).
   Ou seja: qualquer pessoa na internet consegue ler, alterar e apagar os dados do projeto
   `multiplicadores-stor` (inclusive os do app Multiplicadores Stor).
   - **Ação:** publicar `firestore.rules` (já criado na raiz do projeto) em
     Firebase Console > Firestore Database > Regras, ou com
     `npx firebase-tools deploy --only firestore:rules --project multiplicadores-stor`.
   - As regras novas liberam cada usuário apenas para os próprios documentos
     (`userId == request.auth.uid`) e mantêm as regras de `usuarios`/`modulos_sistema`
     que o app Multiplicadores Stor espera.

2. **Restringir a apiKey por domínio (defesa em profundidade).**
   Google Cloud Console > APIs e serviços > Credenciais > restringir a Browser key para
   `https://storsistemas.github.io/*` e `http://localhost:3000/*`. Se a chave tiver sido
   usada fora do navegador, gerar uma nova.

3. **Firebase App Check (reCAPTCHA v3)** nas operações de Firestore para bloquear scripts
   que usem a apiKey fora do app.

4. **Fluxo de senha esquecida não existe.** `login/page.tsx` não oferece
   `sendPasswordResetEmail` — adicionar link "Esqueci minha senha" e tela de redefinição
   (o app é o único caminho de entrada dos usuários).

5. **Mover a configuração do Firebase para variáveis de ambiente** (`NEXT_PUBLIC_FIREBASE_*`)
   em `src/lib/firebase.ts`, mantendo fallback para os valores atuais, para facilitar troca
   de projeto/chave sem alterar código.

---

## P1 — Conexões e infraestrutura

1. **Git não está instalado nesta máquina** (`git.exe` não existe em PATH, em
   `C:\Program Files` nem no registro). O repositório local está sincronizado até o commit
   `feat: adiciona abas Pendentes/Concluidos nos lembretes` na branch `main`.
   Sem Git não é possível publicar melhorias pelo fluxo atual (push → GitHub Actions → Pages).
   - **Ação:** instalar Git for Windows (`winget install --id Git.Git`) ou publicar via
     API/interface web do GitHub.

2. **Repositório é público** (`github.com/storsistemas/tarefasdiarias`). Se o código deve ser
   privado, avaliar a migração (GitHub Pages em repositório privado exige plano pago).

3. **CI sem verificação de lint.** `deploy.yml` roda `npm ci` e `npm run build` (que já faz
   type-check). Adicionar `npm run lint` antes do build para não publicar código com erro de lint.

4. **MCP Firebird (banco do ERP STOR)** — 3 de 4 perfis conectam:

   | Perfil | Situação |
   | --- | --- |
   | Retaguarda | OK — `C:\Stor_Restaurante\Dados\Stor.FDB` (local) |
   | Desk | OK — `C:\Desk\Dados\Desk.fdb` via `192.168.15.15:3055` |
   | Agro | OK — `C:\StorAgro\Dados\STOR.FDB` (local) |
   | BancoB | **Falha** — espera `C:\Stor_Restaurante\Analise.ini`, que não existe (só há `Analise.ini.bak`, apontando para `C:\Stor_Restaurante\BancoAnalise\BancoB.FDB`) |

   - **Ação:** restaurar/criar o `Analise.ini` (ou ajustar o apelido no `mcp-config.json`
     global do pacote `mcp-stor-firebird`) para usar a análise local.

5. **Identidade duplicada entre os apps do mesmo projeto Firebase:**
   Tarefas Diárias grava `/users/{uid}` (`src/app/cadastro/page.tsx`) enquanto o
   Multiplicadores Stor usa `/usuarios/{uid}` com `role` e `status` (`pendente`/`aprovado`).
   - **Ação recomendada:** usar `usuarios` como fonte única, aproveitar o fluxo de aprovação
     já existente para liberar o acesso e permitir, no futuro, tarefas compartilhadas por
     squad/equipe.

6. **Integração com o ERP (opcional, definir requisito):** com o MCP Firebird conectado é
   possível ler atividades/chamados do Desk/Retaguarda e gerar a lista diária dentro do app
   (ex.: "chamados atribuídos a mim hoje"). Precisa de backend/Cloud Function, porque o site
   é estático.

---

## P2 — Produto

1. **Alerta só funciona com a aba aberta.** `TaskAlertWatcher` compara `task.time` com o
   horário atual a cada 30s e usa uma ref em memória (`alertedRef`) — se a página estava
   fechada no minuto exato, o alerta nunca dispara, e ao recarregar pode repetir.
   - Adicionar janela de tolerância (ex.: disparou nos últimos 15 min), persistir o que já foi
     alertado (localStorage por dia) e usar `Notification` API + service worker (PWA
     instalável no celular) para notificar em segundo plano.

2. **Lembretes vencidos aparecem para sempre.** `ReminderAlert` mostra todo lembrete com
   `alertAt <= now`, inclusive de dias anteriores, sem indicar atraso.
   - Filtrar por janela (ex.: vencidos nas últimas 24h) e exibir "atrasado há X".

3. **Histórico e acompanhamento:** hoje só existe a visão do dia selecionado.
   Sugestões: adesão (dias concluídos ÷ previstos), sequência atual (streak), calendário com
   marcação de dias 100%, exportação CSV/PDF e relatório semanal por e-mail.

4. **`completions` como mapa dentro do documento da atividade** cresce indefinidamente
   (limite de 1 MB por documento e reescrita do documento inteiro a cada marcação).
   - Migrar para subcoleção `tasks/{taskId}/completions/{YYYY-MM-DD}` ou coleção `taskLogs`
     (mantendo compatibilidade de leitura durante a migração).

5. **Recursos de uso diário:** busca e filtro (texto/prioridade), ordenação por horário,
   duplicar atividade, adiar/soneca, reagendar, notas/checklist na atividade, "dia inteiro"
   e múltiplos horários por atividade.

6. **PWA + offline:** `manifest.json`, ícones, service worker e `persistentLocalCache` do
   Firestore para funcionar sem internet e abrir mais rápido no celular.

7. **Compartilhamento/equipe:** permitir tarefas e lembretes compartilhados (por squad/loja)
   com níveis de permissão, seguindo o modelo de squads usado no Storagentes.

---

## P3 — Qualidade de código e UX

1. **Lint com falhas** (`npm run lint`): 3 erros `react-hooks/set-state-in-effect`
   (`ReminderAlert.tsx:65`, `TaskList.tsx:27`, `ThemeProvider.tsx:24`) e 2 warnings de
   variáveis não usadas (`ReminderAlert.tsx:16` — `h`, `m`).

2. **Conversão de documentos duplicada** em `TaskList.tsx`, `TaskAlertWatcher.tsx`,
   `ReminderList.tsx` e `ReminderAlert.tsx` → extrair mappers (`toTask`, `toReminder`) para
   `src/lib/mappers.ts` (ou um hook `useUserCollection`).

3. **`AuthProvider` é montado página por página** (`page.tsx`, `dashboard/page.tsx`) →
   mover para `app/layout.tsx` e criar um `RequireAuth` reutilizável.

4. **Testes automatizados ausentes.** Sugestão: Vitest + Testing Library para `lib/dates.ts`
   e componentes (recorrência, cálculo do horário do alerta, filtro do dia) e Playwright para
   o fluxo login → criar atividade → concluir.

5. **Acessibilidade do modal de alerta:** usar `role="dialog"`, `aria-modal`, fechar com ESC,
   prender o foco e trocar `confirm()` nativo por um diálogo próprio.

6. **Mensagens de erro do Firestore** aparecem cruas (`err.message`, em inglês) em
   `TaskList.tsx`; traduzir como já é feito no login/cadastro.

7. **Sem página de perfil/ajustes:** trocar nome e senha, preferência de som e
   horário de "não perturbe".

---

## Ordem sugerida de execução

1. Publicar as regras do Firestore (`firestore.rules`) e revisar a apiKey — **hoje**.
2. Instalar Git e ajustar o CI (rodar lint) para voltar a publicar com segurança.
3. Corrigir os 3 erros de lint + extrair mappers (limpeza que facilita tudo o que vem depois).
4. Alertas confiáveis (tolerância, persistência e notificação do navegador) — maior ganho
   percebido pelo usuário.
5. Senha esquecida, perfil/ajustes e unificação de identidade com o Multiplicadores Stor.
6. Histórico/relatórios, busca/filtros e PWA offline.

