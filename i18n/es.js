export default {
  app: { name: 'FaberLoom', tagline: 'Control plane de agentes con evidencia' },
  nav: {
    dashboard: 'Tablero', bandeja: 'Bandeja', agentes: 'Agentes',
    skills: 'Skills', workflows: 'Workflows', conexiones: 'Conexiones',
    admin: 'Admin', settings: 'Ajustes', factory: 'Factory'
  },
  topbar: {
    search: 'Buscar o ejecutar (⌘K)…',
    theme: { light: 'Tema claro', dark: 'Tema oscuro', toggle: 'Cambiar tema' },
    lang: { es: 'Español', en: 'English', 'pt-BR': 'Português (BR)', label: 'Idioma' },
    user: 'Cuenta'
  },
  state: {
    loaded: 'Con datos', empty: 'Vacío', loading: 'Cargando', error: 'Error',
    label: 'Estado de vista'
  },
  status: {
    active: 'Activo', paused: 'Pausado', shadow: 'Shadow', archived: 'Archivado',
    ok: 'Saludable', warning: 'Atención', error: 'Error',
    success: 'Éxito', danger: 'Riesgo', info: 'Info', neutral: 'Neutro'
  },
  autonomy: {
    label: 'Autonomía',
    L0: { name: 'Shadow', short: 'L0', help: 'Observa, no propone ni ejecuta.' },
    L1: { name: 'Propone', short: 'L1', help: 'Propone borradores, humano aprueba.' },
    L2: { name: 'Auto-low', short: 'L2', help: 'Ejecuta acciones de bajo riesgo. Humano notificado.' },
    L3: { name: 'Auto+notif', short: 'L3', help: 'Ejecuta y notifica con resumen diario.' },
    L4: { name: 'Auto+excep', short: 'L4', help: 'Solo escala excepciones al humano.' },
    locked: 'Bloqueado',
    nextUnlock: 'Próximo desbloqueo',
    criterion: 'Criterio'
  },
  bandeja: {
    title: 'Bandeja',
    filters: { all: 'Todos', byAgent: 'Por agente', byRisk: 'Por riesgo', byAge: 'Por antigüedad' },
    empty: { title: 'Bandeja al día', subtitle: 'Última aprobación hace 12 min.' },
    age: { now: 'ahora', minutes: 'min', hours: 'h' },
    detail: {
      from: 'De', to: 'Para', subject: 'Asunto',
      tabs: { evidence: 'Evidencia', provenance: 'Procedencia', risk: 'Action-risk', trace: 'Run trace' },
      actions: { approve: 'Aprobar', edit: 'Editar', reject: 'Rechazar', consolidate: 'Consolidar como aprendizaje' },
      evidence: {
        empty: 'Sin spans',
        source: 'Fuente', version: 'Versión', lines: 'Líneas',
        openInKb: 'Abrir en KB'
      },
      risk: {
        class: 'Clase de riesgo', mode: 'Modo aprobación', reversible: 'Reversible',
        customer: 'Visible al cliente', financial: 'Impacto financiero', truth: 'Fuente de verdad',
        modes: { human_required: 'Aprobación humana', auto_low: 'Auto bajo riesgo', shadow: 'Shadow' },
        levels: { low: 'Bajo', medium: 'Medio', high: 'Alto', critical: 'Crítico', none: 'Ninguno' }
      },
      trace: { step: 'Paso', at: 'Hora', dur: 'Duración', ok: 'OK', fail: 'Falla' }
    }
  },
  agent: {
    console: { title: 'Consola del agente' },
    tabs: { summary: 'Resumen', skills: 'Skills', memory: 'Memoria', logs: 'Logs' },
    kpis: {
      draftsToday: 'Drafts hoy',
      approved7d: 'Aprobados 7d',
      approvalRate7d: '% Aprob. 7d',
      cost7d: 'Costo 7d (USD)'
    },
    health: { ok: 'OK', warning: 'Atención', error: 'Error' },
    nextUnlock: { title: 'Próximo desbloqueo', criterion: 'Criterio' },
    skills: { activeLayer: 'Capa activa', approvalRate: 'Aprob.' },
    memory: {
      session: 'Sesión', project: 'Proyecto', global: 'Global',
      forget: 'Olvidar', empty: 'Sin recuerdos en esta capa.'
    },
    logs: { empty: 'Sin runs en el rango.' }
  },
  skill: {
    title: 'Skill Studio',
    layers: { base: 'Capa Base', manual: 'Overlay manual', learned: 'Overlay aprendido' },
    base: { sealed: 'Sellada · solo lectura', published: 'Publicada' },
    manual: { addRule: 'Agregar regla', version: 'Versionar' },
    learned: {
      hot: '🔴 Caliente', warm: '🟡 Tibio', cold: '🔵 Frío',
      pending: 'patrones por consolidar', active: 'reglas activas',
      reverted: 'revertidas', openModal: 'Abrir consolidación'
    },
    goldSamples: {
      title: 'Gold samples', candidate: 'Candidato', active: 'Activo', archived: 'Archivado',
      empty: 'Sin gold samples aún'
    }
  },
  workflow: {
    title: 'Workflows',
    nodes: { trigger: 'Trigger', action: 'Acción', condition: 'Condición', skill: 'Skill', output: 'Output', loop: 'Loop' },
    toolbar: { run: 'Ejecutar', deploy: 'Desplegar', fit: 'Ajustar', zoom: 'Zoom' },
    inspector: { empty: 'Seleccioná un nodo' }
  },
  feedback: {
    title: 'Feedback al draft',
    subtitle: 'Marcá la razón principal. Esto entrena al agente.',
    reasons: {
      claim: { title: 'Claim sin evidencia suficiente', help: 'Marca el claim_id problemático y alimenta el clasificador.' },
      tone:  { title: 'Tono no acorde con cliente',     help: 'Etiqueta el span y va a refinement de skill.' },
      data:  { title: 'Dato incorrecto o desactualizado', help: 'Marca source_version y avisa al owner de KB.' },
      risk:  { title: 'Acción riesgosa para el contexto', help: 'Sube risk_class del action en registry.' },
      other: { title: 'Otro', help: 'Va a triage manual, no auto-aprende.' }
    },
    note: 'Nota libre (opcional)',
    submit: 'Enviar feedback', cancel: 'Cancelar'
  },
  consolidation: {
    title: 'Consolidar aprendizaje',
    sections: {
      learned: 'Qué se aprendió', applies: 'Dónde aplica',
      impact: 'Qué impacta', confirm: 'Confirmar / Descartar'
    },
    learnTypes: { knowledge: 'Conocimiento', instruction: 'Instrucción', output: 'Output' },
    scopes: { user: 'Usuario', skill: 'Skill', agent: 'Agente', org: 'Organización' },
    crossSkill: 'Propagar a otras skills',
    before: 'Antes', after: 'Después',
    accumulated: 'patrones acumulados desde',
    confirm: 'Indexar como overlay aprendido',
    discard: 'Descartar y mantener manual'
  },
  empty: {
    generic: { title: 'Nada por aquí', subtitle: 'Cuando haya datos aparecerán acá.' },
    filtered: { title: 'Sin resultados', subtitle: 'Probá ajustar los filtros.' }
  },
  error: {
    module: { title: 'Módulo no disponible', subtitle: 'Esta vista falló al cargar. El resto sigue funcionando.', retry: 'Reintentar' },
    boundary: { title: 'Algo se rompió en esta vista', subtitle: 'Reportá si persiste.' }
  },
  a11y: {
    skip: 'Saltar al contenido principal',
    validate: 'Validar accesibilidad',
    closeDialog: 'Cerrar diálogo',
    openMenu: 'Abrir menú'
  }
};
