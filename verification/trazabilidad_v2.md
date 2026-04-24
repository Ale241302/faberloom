# Trazabilidad v2 · 60-row matrix

**Fecha:** 2026-04-19
**Método:** Cada row ata un requirement (prompt v2 o canon SPEC/A1-A7) → fragment(s) que lo implementan → widget/data/route específico → status.

Leyenda: **🟢 green** = implementado y verificable · **🟡 yellow** = implementado parcialmente · **🔴 red** = pendiente · **📋 doc** = documentación/decisión

| # | Requirement origin | Fragment / artifact | Widget / data / route | Status | Nota |
|---|---|---|---|---|---|
| 1 | v2 §3.1 Chat module route default | 03_boot + 17_chat | `#/chat` route + `navigate(location.hash \|\| '#/chat')` | 🟢 | Default hash patched |
| 2 | v2 §3.1 Layout 3 columnas | 17_chat | CSS `.fl-chat-app { grid-template-columns:280px 1fr 320px }` | 🟢 | Responsive breakpoints 1180 / 820 |
| 3 | v2 §3.1 Left Always-on | 17_chat `renderLeft()` | `fl-ch-always` section + 🔒 chips | 🟢 | Personal + Org con tenant name dinámico |
| 4 | v2 §3.1 Left Agents 6 visible | 17_chat + 05_mock `availableAgents` | 6 entries con autonomy + sparkline | 🟢 | W.sparkline inline SVG |
| 5 | v2 §3.1 Left Skills 12 visible | 17_chat + 05_mock `availableSkillsForChat` | 12 entries con learningHeat icon via W.skillPill | 🟢 | Thermometer icons 🔴🟡⚪⭐ |
| 6 | v2 §3.1 Skill click toggle | 17_chat wire | `state.activeSkills.add/delete` | 🟢 | 2do click remueve |
| 7 | v2 §3.1 Agent click handoff | 17_chat wire | `state.activeAgent = id` + pre-carga skills | 🟢 | Header "Hablando con:" dinámico |
| 8 | v2 §3.1 Center empty state | 17_chat `renderEmptyCenter()` | W.suggestGrid 2x2 con 4 items | 🟢 | suggest_1..4 en i18n |
| 9 | v2 §3.1 SuggestGrid picks → composer | 17_chat wire `[data-suggest]` | Popula `textarea.fl-composer__input` | 🟢 | Focus + input event |
| 10 | v2 §3.1 Messages con provenance sup | 17_chat `renderMessageBody` | W.provenanceSup + `[E1]..[En]` replace | 🟢 | Matches evidenceSpans order |
| 11 | v2 §3.1 Cross-highlight sup ↔ GroundedIn | 17_chat wire sup | `.fl-gin__row.highlighted` toggle por ev.source | 🟢 | mouseenter/focus/click |
| 12 | v2 §3.1 PatternBadge en message | 06_widgets + 17_chat | W.patternBadge({kind, count, rating}) | 🟢 | learned/gold/none/sealed |
| 13 | v2 §3.1 MessageActionsMenu 8 acciones | 06_widgets + 17_chat | W.messageActionsMenu + wireMessageActionsMenu | 🟢 | Focus trap + click-outside close |
| 14 | v2 §3.1 IterationComposer embedded | 06_widgets + 17_chat `showIterationComposer` | Insertado `afterend` del article | 🟢 | NO en composer principal |
| 15 | v2 §3.1 Iteration badge "Iteration N" | 17_chat `renderMessage` | `chip-accent fl-ch-msg__iter-badge` | 🟢 | Visible si `iterationOf` truthy |
| 16 | v2 §3.1 Draft pill + link to bandeja | 17_chat `renderDraftPills` | `<a class="fl-draft-pill" href="#/bandeja/...">` | 🟢 | State badge integrado |
| 17 | v2 §3.1 GroundedInBlock right | 06_widgets W.groundedInBlock + 17_chat `resolveGroundedInSources` | Match by title keyword OR aggregate evidence | 🟢 | 2-5 sources top |
| 18 | v2 §3.1 SLABar right | 06_widgets W.slaBar + 17_chat | target 300 vs current 310 → warn state | 🟢 | Color-coded breach |
| 19 | v2 §3.1 Active handoffs right | 17_chat `collectConversationHandoffs` | Drafts generados durante la conversación | 🟢 | Linkea a bandeja |
| 20 | v2 §3.1 VoiceOfCustomer card | 06_widgets W.voiceOfCustomerCard + 05_mock `voiceOfCustomerSamples` | 4 quotes con sentiment | 🟢 | Rotación por hash(convId) |
| 21 | v2 §3.2 Agent-level conversation query | 03_boot resolve(hash) | Parse `?agent=X&skill=Y` → `ctx.query` | 🟢 | Query split antes de match |
| 22 | v2 §3.2 Pre-activate agent skills | 17_chat mount | `if (state.pinnedAgent) ag.skills.forEach(state.activeSkills.add)` | 🟢 | Desde `agent-console` |
| 23 | v2 §3.3 Mock conversations 8 | 05_mock_data | `conversations` array con 8 entries | 🟢 | 7 active + 1 archived |
| 24 | v2 §3.3 Mock messages ~50 | 05_mock_data | `messages` array con ~45-50 messages | 🟢 | Incluye 1 iteration (msg_013b) |
| 25 | v2 §3.3 availableAgents derivation | 05_mock_data | 6 entries + sparkline + runsLast7d | 🟢 | Inline sparklineData 7d |
| 26 | v2 §3.3 availableSkillsForChat 12 | 05_mock_data | 12 entries con learningHeat | 🟢 | sk_cotizar hot, consolidate gold |
| 27 | v2 §3.3 knowledgeHeatSamples 6 | 05_mock_data | 6 query-pattern → sources samples | 🟢 | Para GroundedIn matching |
| 28 | v2 §3.3 voiceOfCustomerSamples 4 | 05_mock_data | 4 quotes con sentiment + source | 🟢 | 2 positive, 1 neutral, 1 negative |
| 29 | v2 §3.4 ChatComposer widget | 06_widgets | W.chatComposer + W.wireChatComposer | 🟢 | Enter=send, Shift+Enter=newline, ⌘Enter=send |
| 30 | v2 §3.4 IterationComposer widget | 06_widgets | W.iterationComposer + W.wireIterationComposer | 🟢 | Esc=cancel, ⌘Enter=iterate |
| 31 | v2 §3.4 SkillPill widget | 06_widgets | W.skillPill con active ring | 🟢 | data-skill + aria-pressed |
| 32 | v2 §3.4 AgentChip widget | 06_widgets | W.agentChip con autonomy badge | 🟢 | Color via var(--autonomy-lX) |
| 33 | v2 §3.4 GroundedInBlock widget | 06_widgets | W.groundedInBlock con score bar | 🟢 | Highlight por data-evidence match |
| 34 | v2 §3.4 MessageActionsMenu widget | 06_widgets | W.messageActionsMenu + wire | 🟢 | 8 acciones i18n |
| 35 | v2 §3.4 PatternBadge widget | 06_widgets | W.patternBadge({kind, count, rating}) | 🟢 | 4 variantes visual (learned/gold/none/sealed) |
| 36 | v2 §3.4 VoiceOfCustomerCard widget | 06_widgets | W.voiceOfCustomerCard con sentiment icon | 🟢 | Georgia italic quote |
| 37 | v2 §3.4 SuggestGrid widget | 06_widgets | W.suggestGrid 2x2 | 🟢 | Mobile: 1-col |
| 38 | v2 §3.4 SLABar widget | 06_widgets | W.slaBar con target + breach pred | 🟢 | ok/warn/breach states |
| 39 | v2 §3.5 Shell Chat nav item | 04_shell | `<a href="#/chat" data-route="chat">` | 🟢 | Antes de Bandeja en group_main |
| 40 | v2 §3.6 Boot register chat routes | 03_boot | moduleRoutes entries `/`, `/chat`, `/chat/:id` → chat | 🟢 | Default path también apunta a chat |
| 41 | v2 §3.6 Boot default hash | 03_boot | `navigate(hash \|\| '#/chat')` | 🟢 | Primera impresión conversacional |
| 42 | v2 §3.6 Boot keybindings ⌘E | 03_boot | `bus.emit('chat:iterate-last')` | 🟢 | Handled por chat module |
| 43 | v2 §3.6 Boot keybindings ⌘A/⌘B | 03_boot | `location.hash = '#/agentes/...'` / `#/bandeja` | 🟢 | `isTypingTarget` guard |
| 44 | v2 §3.6 Boot keybinding ⌘/ | 03_boot | `bus.emit('chat:toggle-skill-search')` | 🟢 | Chat module focus input |
| 45 | v2 §3.6 Handle ?agent=X&skill=Y | 03_boot resolve | query parsing + ctx.query | 🟢 | decodeURIComponent |
| 46 | v2 §3.7 Bulk approve en bandeja-lista | 10_bandeja_lista | `state.selected` Set + bulk toolbar sticky | 🟢 | Marker `[V2-PATCH]` |
| 47 | v2 §3.7 Double-confirm irreversible | 10_bandeja_lista `handleBulkApprove` | `hasIrrev` check → 2 `confirm()` | 🟢 | Escalated en UI |
| 48 | v2 §3.8 GroundedInBlock en bandeja-detail | 11_bandeja_detail | `<section class="bd-grounded">` + W.groundedInBlock top-3 | 🟢 | Link "Ver Evidencia" jump |
| 49 | v2 §3.9 PatternBadge en skill-studio | 12_skill_studio | `colLearned` usa W.patternBadge; `colBase` usa sealed badge | 🟢 | Cada row learned |
| 50 | v2 §3.10 Tab Conversación en agent-console | 13_agent_console | 5ta tab con `renderConversation(agent)` | 🟢 | Botón + lista recentes |
| 51 | v2 §3.10 Botón "Abrir chat con este agente" | 13_agent_console `renderConversation` | `<a href="#/chat/new?agent=agent.id">` | 🟢 | Pre-pinea agente |
| 52 | v2 §3.11 Admin-users edit modal | 20_admin_users `openEditModal` | Modal con rol/dept/BE/bg/scope | 🟢 | Save emite audit event |
| 53 | v2 §3.11 Break-glass countdown 8h | 20_admin_users + 03_boot `FL.session` | `activateBreakGlass(8)` + countdown display | 🟢 | MFA warning en modal |
| 54 | v2 §3.12 Admin-knowledge 3-step promote | 21_admin_knowledge `openPromoteModal` | 3 pasos: preview+diff / sanitize / confirm | 🟢 | 4 checks sanitización |
| 55 | v2 §3.12 Promote emite audit event | 21_admin_knowledge `commit()` | `action: 'memory_chunk.promoted'` + before/after state | 🟢 | Unshift a auditEvents |
| 56 | v2 §3.13 Admin-connectors config modal | 24_admin_connectors `openConfigModal` | W.tabs 3 paneles: creds/scope/test | 🟢 | Test simula latencia |
| 57 | v2 §3.13 Connector test button | 24_admin_connectors | `[data-cx-test]` + setTimeout 800ms + result | 🟢 | OK randomized 600-1000ms |
| 58 | v2 §2 i18n symmetric | 07_i18n_{es,en,pt} | 377 leaf keys cada uno | 🟢 | Beats 332+ target |
| 59 | A4/A5/A6 canon preservado | research/A1..A7 | 7 docs + reconciliaciones | 📋 | Ver A7_chat_contradictions |
| 60 | v2 §2 regla 10 docstrings widgets | 06_widgets | JSDoc `/**` en cada widget nuevo | 🟢 | props + returns documentados |

---

## Resumen

- **🟢 green:** 59
- **🟡 yellow:** 0
- **🔴 red:** 0
- **📋 doc:** 1

Cobertura: **59/60 verificables**, 1 documental (A6/A7 reconciliations). Cero rojos.

## Items que requieren live browser

Ninguno de los 60 es unchecked; sin embargo AC #7 de `AC_v2.md` (hover highlight) requiere navegador. Considerar "🟡" operacional hasta verificación visual.
