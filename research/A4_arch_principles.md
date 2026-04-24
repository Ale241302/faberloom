# A4 — ARCH_AGENT_PRINCIPLES Canon

**Source:** `C:\Users\alvar\OneDrive\Documentos\Claude\Projects\MWT KB\docs\ARCH_AGENT_PRINCIPLES.md`
**Version:** 1.1 · **Stamp:** VIGENTE — 2026-04-16 · **Lines:** ~361 (truncated mid-changelog v1.2 entry)
**Header:** status VIGENTE · visibility [INTERNAL] · domain Gobernanza · type POL · aprobador CEO · aplica_a [MWT, FaberLoom]
**Companion refs (NOT expanded):** `SCH_SKILL.md`, `SKILL_*.md`, `SKILL_RUNTIME.md`, `SKILL_MEM_*.md`

---

## 1. Autonomy Ladder L0–L4 (labeled "Nivel 0"–"Nivel 4")

**Global unlock thresholds (Principio 4):**
- Ejecuciones en nivel actual ≥ 10
- Approval rate ≥ 80%
- Edit-light rate (≤20% edición) ≥ 60%
- Rejection rate ≤ 10%
- Días estables sin error grave ≥ 14
- AgentMemory activa: Sí
- Aprobación CEO: Siempre requerida

**Who unlocks:** CEO approves every promotion. System measures evidence.

- **L0 — SHADOW** — "observa, no sale al usuario". Default start. No unlock criterion (default state).
- **L1 — PROPONE** — "draft siempre, aprobación requerida para cualquier acción". Unlock exception: "SHADOW → primer nivel activo requiere solo ≥ 3 ejecuciones con approval rate > 70%".
- **L2 — EJECUTA_INTERNO** — "acciones internas sin aprobación (KB, resúmenes, etiquetas)". Global thresholds.
- **L3 — AUTO_NOTIFICA** — "ejecuta y notifica post-hecho (acciones reversibles probadas)". Global thresholds.
- **L4 — AUTO_EXCEPCIONES** — "auto en flujos muy estrechos, CEO solo ve excepciones". Global thresholds.

**Automatic degradation:** "si rejection rate > 30% en últimas 5 ejecuciones, error grave en acción de alto impacto, o dependencia de KB rota".

---

## 2. The 3 canonical objects

**AgentSpec** — "Lo que el agente ES (estático, versionado, inmutable entre ejecuciones)". Fields: `trigger_word`, `autonomy_ceiling`, `escalation_policy`, `kb_refs`, `state_machine`, `events`, `learning_consolidation`. Static contract.

**AgentRuntime** — "Lo que el agente HACE (dinámico, actualizado por ejecución)". Fields: estado actual, autonomía real actual (≤ ceiling), métricas (ejecuciones, approval rate, edit-light rate, rejection rate), cola de outputs pendientes (termómetro), última ejecución. Bound by ceiling.

**AgentMemory** — "Lo que el agente APRENDIÓ (acumulado, solo se escribe con gate humano)". Fields: gold samples activos, patrones aprobados y correcciones, excepciones documentadas, perfiles de remitente/contexto. Only mutable object; only via human confirmation.

---

## 3. Skill layers — NOT formally "base/manual/learned"

The 3-label scheme is **NOT** in this doc. Closest structures:

**P11 3-destination classifier:**
- Contexto → pgvector namespace org (cross-skill)
- Skill refinement → "Org AgentSpec (capa sobre base)" (por skill) — only "base" mention
- Gold sample → AgentMemory del skill (por skill)

**Human gate phrases (verbatim):** "gate humano" (P1, P5), "revisión humana" (P5), "aprobación explícita" (P3).

**TTL of "90d":** [NOT IN DOC]. Comes from SPEC_USER_ADMIN_KNOWLEDGE_FLOW (confirmed in A5).

---

## 4. Draft-first workflow

**State machine (Principio 7, verbatim ASCII):**
```
drafting → awaiting_approval → approved → executing → completed
                ↓                                        ↓
            rejected ← ← ← ← ← ← ← ← ← ← ← ← ←    escalated
```

**Reversible vs irreversible:**
- Irreversible / external (always require approval regardless of autonomy): "correo, WhatsApp, Slack, webhooks, CRM writes, compromisos de fecha/monto/términos"
- Reversible internal (higher autonomy): "KB, resúmenes, etiquetas" (L2), "acciones reversibles probadas" (L3)
- **Verbatim rule:** "El autonomy ladder gobierna acciones internas — nunca acciones externas con impacto real"

---

## 5. Action-risk registry (6 fields)

**[NOT IN DOC]** — The 6 field names (`action_id`, `reversibility`, `side_effects`, `min_autonomy`, `required_role`, `audit_class`) do NOT appear in this doc.

**Related concepts:**
- Reversibility discussed in P3, L3
- P9 gates (verbatim):
  - "¿Hay aprobación explícita del humano responsable?"
  - "¿La acción está dentro del scope declarado en AgentSpec?"
  - "¿La dependencia KB está vigente (no DEPRECATED, no rota)?"
  - "¿El nivel de autonomía actual permite esta acción?"

---

## 6. Provenance chain

**[NOT IN DOC]** — None of `claim`, `evidence_span`, `source_version`, `retrieval_run_id` appear.

**Closest: ModelFingerprint (P13)** — fields: `provider`, `model_family`, `model_version`, `system_prompt_hash`, `tools_manifest_hash`, `policy_version`, `retrieval_index_version`. Attached to autonomy state: "autonomía no pertenece al agente solo — pertenece a: agente × modelo × toolchain × policy version".

---

## 7. Principios P0–P13

- **P0** — Un agente no es un prompt; agent = "identidad + estado + contexto mínimo exacto + eventos + memoria curada + feedback estructurado + guardrails operativos"
- **P1** — Separación obligatoria en 3 objetos (Spec / Runtime / Memory)
- **P2** — Contexto mínimo y exacto (precisión = primera palanca)
- **P3** — Draft-first es absoluto (external comms, financial, CRM writes, commitments require human approval regardless of autonomy)
- **P4** — Autonomía por evidencia, nunca por configuración (CEO approval always required)
- **P5** — Aprendizaje con gate humano (agent does NOT write own memory; human presses "Indexar Aprendizaje")
- **P6** — Feedback tipificado, no texto libre: codes `tone`, `data`, `structure`, `policy`, `scope`, `context`
- **P7** — State machine explícita por agente (drafting → awaiting_approval → approved → executing → completed, with rejected/escalated branches)
- **P8** — Telemetría mínima: total execs, SHADOW execs, current-level execs, approval rate, edit-light rate, rejection rate, resolution time, pending-consolidation queue, policy blocks, human escalations
- **P9** — Gobernanza embebida, no agregada después (gates BEFORE execution)
- **P10** — Handoffs estructurados: `task · goal · context · constraints · artifacts · deadline · confidence · requested_output_format`
- **P11** — Clasificador aprendizaje 3 destinos (Contexto / Skill refinement / Gold sample) con `auto_approve: false` always
- **P12** — Propagación cross-skill del aprendizaje (Org-wide / Cluster / Skill-specific; human checkbox)
- **P13** — Contención memoria y autonomía (per agent, per org, bound to ModelFingerprint; fingerprint change → probation → one level down → revalidation)

---

## 8. Exact quotes to preserve

1. "draft-first es absoluto"
2. "Esto no cambia con ningún nivel de autonomía."
3. "El autonomy ladder gobierna acciones internas — nunca acciones externas con impacto real."
4. "gate humano"
5. "Indexar Aprendizaje"
6. "Nunca auto-promover desde thumbs up."
7. "Autonomía por evidencia, nunca por configuración"
8. "contexto mínimo y exacto"
9. "Gobernanza embebida, no agregada después"
10. "Todos los skills arrancan en SHADOW"
11. "auto_approve: false"
12. "Cada organización construye evidencia propia desde nivel 0."
13. "regresión silenciosa de calidad"
14. "termómetro" → states: "🔵 Frío (0-2)", "🟡 Tibio (3-5)", "🔴 Caliente (6+, urgente)"
15. "Un agente no es un prompt"

**Note:** Neither "private-by-default" nor "break-glass" appear in this doc. [NOT IN DOC].

---

## 9. Gaps

1. Skill 3-layer "base / manual / learned" not enumerated by those names
2. TTL 90d — [NOT IN DOC] (confirmed in A5)
3. Action-risk registry 6 fields — [NOT IN DOC]
4. Provenance chain — [NOT IN DOC]
5. L0 unlock criterion + actor — default; not stated
6. Per-level unlock criteria — single global threshold + SHADOW→L1 exception
7. Tenant-owner vs admin vs system as "who unlocks" — only "CEO" and "humano" named
8. "private-by-default" phrase — [NOT IN DOC]
9. "break-glass" phrase — [NOT IN DOC]
10. Changelog v1.2 truncated at "+Principio 13 ("

---

## Gold sample pipeline (from P5/P11)

**Candidate → revisión humana → eval/simulación → Gold sample activo → Archived / Reverted**

Note: this doc uses "Reverted" (user's prompt matches). A5 doc uses "revoked" for memory_chunk status. Two different pipelines: A4 is skill-level learning; A5 is memory_chunk-level sharing.
