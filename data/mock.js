/* ============================================================
   Mock data — 1 workspace Muito Work · B2B calzado seguridad LatAm
   ============================================================ */

export const workspace = {
  id: 'ws_muito_work',
  name: 'Muito Work',
  plan: 'Team',
  members: 4
};

export const agents = [
  {
    id: 'ag_cotizador',
    name: 'Cotizador B2B',
    persona: 'Prepara cotizaciones de calzado de seguridad para distribuidores',
    icon: '📄',
    status: 'active',
    autonomy: 1,                 // L1 — Propone
    autonomyTargetCriteria: '≥85 % aprobado en 50 runs',
    autonomyCurrent: { approvedRate: 67, runs: 43 },
    kpis: { draftsToday: 9, approved7d: 38, approvalRate7d: 67, cost7d: 12.40 },
    skills: ['sk_cotizar', 'sk_calificar', 'sk_referencias'],
    health: 'ok',
    thermometer: 'hot',          // 🔴 Caliente — 7 patrones pendientes
    nextUnlockProgress: 0.67
  },
  {
    id: 'ag_followup',
    name: 'Follow-up comercial',
    persona: 'Da seguimiento a cotizaciones sin respuesta',
    icon: '📬',
    status: 'active',
    autonomy: 2,
    autonomyTargetCriteria: '≥90 % aprobado en 80 runs + cero escalaciones',
    autonomyCurrent: { approvedRate: 84, runs: 71 },
    kpis: { draftsToday: 3, approved7d: 22, approvalRate7d: 91, cost7d: 4.80 },
    skills: ['sk_followup', 'sk_tono_comercial'],
    health: 'ok',
    thermometer: 'warm',
    nextUnlockProgress: 0.88
  },
  {
    id: 'ag_calificador',
    name: 'Calificador de leads',
    persona: 'Clasifica leads nuevos por fit BANT + sector',
    icon: '🎯',
    status: 'active',
    autonomy: 0,                 // Shadow
    autonomyTargetCriteria: 'subir a L1 con ≥70 % aprobado en 30 runs',
    autonomyCurrent: { approvedRate: 62, runs: 24 },
    kpis: { draftsToday: 1, approved7d: 15, approvalRate7d: 62, cost7d: 2.10 },
    skills: ['sk_bant', 'sk_sector'],
    health: 'ok',
    thermometer: 'cold',
    nextUnlockProgress: 0.48
  },
  {
    id: 'ag_recordatorio',
    name: 'Recordatorio de pago',
    persona: 'Envía recordatorios a cuentas con facturas vencidas',
    icon: '💰',
    status: 'paused',
    autonomy: 1,
    autonomyTargetCriteria: '≥85 % aprobado en 50 runs',
    autonomyCurrent: { approvedRate: 78, runs: 46 },
    kpis: { draftsToday: 0, approved7d: 12, approvalRate7d: 78, cost7d: 1.20 },
    skills: ['sk_cobranza', 'sk_tono_firme'],
    health: 'warning',
    thermometer: 'warm',
    nextUnlockProgress: 0.78
  },
  {
    id: 'ag_onboarding',
    name: 'Onboarding de cliente',
    persona: 'Guía al cliente B2B nuevo por el setup inicial',
    icon: '🤝',
    status: 'active',
    autonomy: 1,
    autonomyTargetCriteria: '≥85 % aprobado en 50 runs',
    autonomyCurrent: { approvedRate: 71, runs: 38 },
    kpis: { draftsToday: 1, approved7d: 8, approvalRate7d: 71, cost7d: 2.00 },
    skills: ['sk_onboarding'],
    health: 'ok',
    thermometer: 'warm',
    nextUnlockProgress: 0.63
  },
  {
    id: 'ag_soporte',
    name: 'Soporte tier-1',
    persona: 'Responde consultas de producto y logística',
    icon: '🛟',
    status: 'active',
    autonomy: 2,
    autonomyTargetCriteria: '≥92 % aprobado en 100 runs',
    autonomyCurrent: { approvedRate: 89, runs: 87 },
    kpis: { draftsToday: 4, approved7d: 41, approvalRate7d: 89, cost7d: 6.30 },
    skills: ['sk_catalogo', 'sk_logistica'],
    health: 'ok',
    thermometer: 'cold',
    nextUnlockProgress: 0.87
  },
  {
    id: 'ag_renovador',
    name: 'Renovador de cuenta',
    persona: 'Propone renovación antes del vencimiento del contrato',
    icon: '🔄',
    status: 'active',
    autonomy: 0,
    autonomyTargetCriteria: 'subir a L1 con ≥70 % aprobado en 30 runs',
    autonomyCurrent: { approvedRate: 55, runs: 18 },
    kpis: { draftsToday: 0, approved7d: 5, approvalRate7d: 55, cost7d: 0.90 },
    skills: ['sk_renovacion'],
    health: 'ok',
    thermometer: 'cold',
    nextUnlockProgress: 0.36
  }
];

export const skills = {
  sk_cotizar: {
    id: 'sk_cotizar',
    name: 'Cotizar calzado seguridad B2B',
    base: {
      version: '1.0.3',
      sealed: true,
      publishedAt: '2026-03-12',
      body: [
        'Eres el motor de cotización B2B de calzado de seguridad industrial.',
        'ENTRADA: consulta de cliente distribuidor con marca, modelo, talle, cantidad, zona geográfica.',
        'SALIDA: draft de correo con precio, disponibilidad, plazo de entrega, condiciones.',
        'Toda afirmación cuantitativa (precio, stock, plazo) DEBE tener evidence_span_id.',
        'Si falta dato, emitir claim "[PENDIENTE]" en lugar de inventar.'
      ].join('\n')
    },
    overlayManual: [
      { id: 'om_1', rule: 'Para clientes de Costa Rica, aplicar descuento de distribuidor 8 %.', by: 'Álvaro', at: '2026-03-20' },
      { id: 'om_2', rule: 'Modelos Goliath, Manta, Leopard: siempre ofrecer alternativa de stock.', by: 'Álvaro', at: '2026-04-02' },
      { id: 'om_3', rule: 'Nunca prometer plazo <5 días hábiles sin confirmación de logística.', by: 'Álvaro', at: '2026-04-11' },
      { id: 'om_4', rule: 'Saludo: "Estimado" para prospectos; "Hola" para clientes recurrentes.', by: 'Álvaro', at: '2026-04-15' }
    ],
    overlayLearned: {
      thermometer: 'hot',
      pendingPatterns: 7,
      activeRules: 4,
      revertedRules: 1,
      pending: [
        { id: 'op_1', pattern: 'Cliente "Distribuidora ABC" aprueba siempre con plazo 7 días, rechaza 5 días', count: 3, confidence: 0.82, appliesTo: 'skill' },
        { id: 'op_2', pattern: 'Monto >10k USD: Operator corrige para pedir referencia comercial previa', count: 5, confidence: 0.91, appliesTo: 'skill' },
        { id: 'op_3', pattern: 'Modelo Goliath x40 tiene 3 semanas de backlog — reflejarlo siempre', count: 4, confidence: 0.88, appliesTo: 'skill' },
        { id: 'op_4', pattern: 'Tono: Operator suaviza "confirmar" a "validar" en clientes premium', count: 6, confidence: 0.79, appliesTo: 'agent' },
        { id: 'op_5', pattern: 'México: agregar datos de IVA en el body, no solo en el footer', count: 4, confidence: 0.85, appliesTo: 'skill' },
        { id: 'op_6', pattern: 'Claim "en stock" reemplazado por "disponibilidad confirmada" tras cotización', count: 3, confidence: 0.72, appliesTo: 'skill' },
        { id: 'op_7', pattern: 'Firma: agregar WhatsApp del vendedor en clientes con >3 compras', count: 5, confidence: 0.80, appliesTo: 'user' }
      ],
      active: [
        { id: 'oa_1', rule: 'Talles EU 38-45: stock habitual; EU 46-48 requiere pedido especial.', confirmedAt: '2026-03-28', runs: 23 },
        { id: 'oa_2', rule: 'Colombia: impuesto 19 % se aplica sobre precio CIF.', confirmedAt: '2026-04-05', runs: 11 },
        { id: 'oa_3', rule: 'Marluvas Manta: priorizarlo sobre Goliath si cliente menciona "peso ligero".', confirmedAt: '2026-04-09', runs: 14 },
        { id: 'oa_4', rule: 'Incluir enlace a ficha técnica cuando cliente pregunta por certificaciones.', confirmedAt: '2026-04-12', runs: 19 }
      ]
    },
    goldSamples: [
      { id: 'gs_1', status: 'active', contextSummary: 'Cotización Distribuidora XYZ — Goliath x40, 60 pares, MX', approvedBy: 'Álvaro', approvedAt: '2026-04-10' },
      { id: 'gs_2', status: 'active', contextSummary: 'Cotización Indusur — Manta, 120 pares, CR', approvedBy: 'Álvaro', approvedAt: '2026-04-14' },
      { id: 'gs_3', status: 'candidate', contextSummary: 'Cotización Tecnoseguridad — Leopard + Bison mix, 200 pares, CO', approvedBy: null, approvedAt: null },
      { id: 'gs_4', status: 'archived', contextSummary: 'Cotización vieja pre-Manta', approvedBy: 'Álvaro', approvedAt: '2026-02-15', archivedAt: '2026-03-30' }
    ]
  }
};

export const drafts = [
  {
    id: 'dr_001',
    agentId: 'ag_cotizador',
    subject: 'RE: Cotización botas Goliath x40 — Distribuidora ABC',
    to: 'compras@distribuidora-abc.mx',
    from: 'alvaro@muitowork.com',
    createdAt: '2026-04-19T08:14:00',
    ageMinutes: 42,
    riskClass: 'medium',
    approvalMode: 'human_required',
    reversible: true,
    customerVisible: true,
    financialImpact: 'medium',
    sourceOfTruth: 'KB_Marluvas_v4.2',
    preview: 'Estimada Claudia, adjunto cotización de 60 pares modelo Goliath x40 con plazo de entrega confirmado…',
    body: [
      { text: 'Estimada Claudia,', claim: null },
      { text: '\n\nGracias por su solicitud del 17 de abril. Adjunto la cotización solicitada:', claim: null },
      { text: '\n\n• Modelo: ', claim: null },
      { text: 'Marluvas Goliath x40', claim: { id: 'c_1', evidence_span_id: 'e_1' } },
      { text: '\n• Cantidad: 60 pares (talles EU 39–44, mix según detalle adjunto)', claim: null },
      { text: '\n• Precio unitario: ', claim: null },
      { text: 'USD 38.50', claim: { id: 'c_2', evidence_span_id: 'e_2' } },
      { text: ' (incluye descuento de distribuidor 8 %)', claim: { id: 'c_3', evidence_span_id: 'e_3' } },
      { text: '\n• Plazo de entrega: ', claim: null },
      { text: '7 días hábiles', claim: { id: 'c_4', evidence_span_id: 'e_4' } },
      { text: ' desde confirmación', claim: null },
      { text: '\n• Condiciones de pago: 50 % adelanto · 50 % contra entrega', claim: null },
      { text: '\n\nStock confirmado por bodega CDMX al día de hoy. ', claim: { id: 'c_5', evidence_span_id: 'e_5' } },
      { text: 'El modelo Goliath x40 cumple norma ', claim: null },
      { text: 'EN ISO 20345:2011 S3 SRC', claim: { id: 'c_6', evidence_span_id: 'e_6' } },
      { text: '.\n\nQuedo atento a su confirmación.\n\nSaludos cordiales,\nÁlvaro Alfaro\nMuito Work · Representaciones Marluvas · Tecmater', claim: null }
    ],
    evidence: [
      { span_id: 'e_1', source: 'KB_Marluvas_v4.2 · catalogo.md§Goliath-x40',      version: '4.2', lineRange: '124-128' },
      { span_id: 'e_2', source: 'KB_Marluvas_v4.2 · precios_distribuidor.md§MX',    version: '4.2', lineRange: '42-44'   },
      { span_id: 'e_3', source: 'KB_Muito · policies.md§descuento_distribuidor_CR_MX', version: '2.1', lineRange: '18-19' },
      { span_id: 'e_4', source: 'KB_Logistica · plazos_MX.md§Goliath',               version: '1.3', lineRange: '5-7'     },
      { span_id: 'e_5', source: 'ERP_Stock_2026-04-19 · bodega_CDMX · Goliath-x40',  version: 'live',  lineRange: ''      },
      { span_id: 'e_6', source: 'KB_Marluvas_v4.2 · certificaciones.md§Goliath',     version: '4.2', lineRange: '88-93'   }
    ],
    workflowTrace: [
      { step: 'trigger.email_received',      at: '2026-04-19T08:10:12', ok: true, durMs: 0    },
      { step: 'skill.parse_request',         at: '2026-04-19T08:10:14', ok: true, durMs: 820  },
      { step: 'connector.kb_marluvas.search',at: '2026-04-19T08:10:15', ok: true, durMs: 1240 },
      { step: 'connector.erp.stock_check',   at: '2026-04-19T08:10:17', ok: true, durMs: 680  },
      { step: 'skill.cotizar.compose',       at: '2026-04-19T08:10:18', ok: true, durMs: 2210 },
      { step: 'policy.check_amount_lt_10k',  at: '2026-04-19T08:10:20', ok: true, durMs: 40   },
      { step: 'action.draft_created',        at: '2026-04-19T08:10:20', ok: true, durMs: 12   }
    ]
  },
  {
    id: 'dr_002',
    agentId: 'ag_cotizador',
    subject: 'RE: Pedido 120 pares Manta — Indusur Costa Rica',
    to: 'compras@indusur.co.cr',
    from: 'alvaro@muitowork.com',
    createdAt: '2026-04-19T07:55:00',
    ageMinutes: 61,
    riskClass: 'high',
    approvalMode: 'human_required',
    reversible: true,
    customerVisible: true,
    financialImpact: 'high',
    sourceOfTruth: 'KB_Marluvas_v4.2',
    preview: 'Buen día, confirmando disponibilidad de 120 pares Manta. Monto supera los 10k USD…'
  },
  {
    id: 'dr_003',
    agentId: 'ag_followup',
    subject: 'Seguimiento cotización #COT-2026-0412 · Tecnoseguridad',
    to: 'juan.perez@tecnoseguridad.com.co',
    from: 'alvaro@muitowork.com',
    createdAt: '2026-04-19T06:30:00',
    ageMinutes: 146,
    riskClass: 'low',
    approvalMode: 'auto_low',
    reversible: true,
    customerVisible: true,
    financialImpact: 'low',
    sourceOfTruth: 'KB_Muito',
    preview: 'Hola Juan, ¿cómo va la revisión de la cotización que te envié el martes?…'
  },
  {
    id: 'dr_004',
    agentId: 'ag_calificador',
    subject: 'Calificación lead: Constructora Andes CO',
    to: '(interno)',
    from: 'faberloom@muitowork.com',
    createdAt: '2026-04-19T05:12:00',
    ageMinutes: 224,
    riskClass: 'low',
    approvalMode: 'shadow',
    reversible: true,
    customerVisible: false,
    financialImpact: 'none',
    sourceOfTruth: 'KB_Muito',
    preview: 'Lead recibido desde formulario web. Fit BANT: Budget parcial · Authority sí · Need alto…'
  },
  {
    id: 'dr_005',
    agentId: 'ag_cotizador',
    subject: 'RE: Alternativas modelo Leopard + Bison · Distribuidora Sur',
    to: 'pedidos@distribuidora-sur.com.pe',
    from: 'alvaro@muitowork.com',
    createdAt: '2026-04-19T04:48:00',
    ageMinutes: 248,
    riskClass: 'medium',
    approvalMode: 'human_required',
    reversible: true,
    customerVisible: true,
    financialImpact: 'medium',
    sourceOfTruth: 'KB_Marluvas_v4.2',
    preview: 'Hola, buen día. Sobre los modelos Leopard y Bison que preguntó, le comparto…'
  },
  {
    id: 'dr_006',
    agentId: 'ag_soporte',
    subject: 'RE: Ficha técnica certificación S3 SRC',
    to: 'hse@minerandes.com.co',
    from: 'alvaro@muitowork.com',
    createdAt: '2026-04-19T04:10:00',
    ageMinutes: 286,
    riskClass: 'low',
    approvalMode: 'auto_low',
    reversible: true,
    customerVisible: true,
    financialImpact: 'none',
    sourceOfTruth: 'KB_Marluvas_v4.2',
    preview: 'Buen día. Adjunto ficha técnica oficial del modelo Goliath x40 con la certificación EN ISO 20345:2011…'
  },
  {
    id: 'dr_007',
    agentId: 'ag_onboarding',
    subject: 'Bienvenida · Distribuidora Nueva México',
    to: 'admin@distrinuevamx.mx',
    from: 'alvaro@muitowork.com',
    createdAt: '2026-04-19T03:22:00',
    ageMinutes: 334,
    riskClass: 'low',
    approvalMode: 'human_required',
    reversible: true,
    customerVisible: true,
    financialImpact: 'none',
    sourceOfTruth: 'KB_Muito',
    preview: 'Bienvenidos al programa de distribuidores Muito Work. El proceso de onboarding tiene 4 pasos…'
  }
];

export const consolidations = [
  {
    id: 'cons_1',
    skillId: 'sk_cotizar',
    thermometer: 'hot',
    accumulatedSince: '2026-04-12',
    patternCount: 7,
    suggestedRule: 'Para clientes recurrentes (>3 compras) con monto >10k USD, ofrecer plazo 7 días en lugar de 5.',
    learnType: 'Instrucción',
    scope: 'Skill',
    crossSkill: false,
    impactPreview: { before: 'Plazo ofrecido: 5 días hábiles', after: 'Plazo ofrecido: 7 días hábiles (ajuste por monto y recurrencia)' }
  }
];

export const adminAutonomyEvidence = {
  ag_cotizador: {
    approvalCurve: [
      { date: '2026-01-20', rate: 42 }, { date: '2026-02-05', rate: 48 },
      { date: '2026-02-20', rate: 52 }, { date: '2026-03-05', rate: 58 },
      { date: '2026-03-20', rate: 61 }, { date: '2026-04-05', rate: 64 },
      { date: '2026-04-19', rate: 67 }
    ],
    unlockThreshold: 85,
    correctionDistribution: {
      'Claim sin evidencia suficiente': 18,
      'Tono no acorde con cliente':      24,
      'Dato incorrecto / desactualizado': 12,
      'Acción riesgosa para el contexto': 8,
      'Otro': 6
    },
    failingTypes: [
      { type: 'Cotización monto >10k con cliente nuevo', approvalRate: 41, draftsPerWeek: 5 },
      { type: 'Cotización con mezcla de modelos discontinuados', approvalRate: 52, draftsPerWeek: 3 },
      { type: 'Cotización exportación con impuestos destino', approvalRate: 58, draftsPerWeek: 4 }
    ]
  }
};
