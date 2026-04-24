export default {
  app: { name: 'FaberLoom', tagline: 'Plano de controle de agentes com evidência' },
  nav: {
    dashboard: 'Painel', bandeja: 'Caixa', agentes: 'Agentes',
    skills: 'Skills', workflows: 'Workflows', conexiones: 'Conexões',
    admin: 'Admin', settings: 'Ajustes', factory: 'Factory'
  },
  topbar: {
    search: 'Buscar ou executar (⌘K)…',
    theme: { light: 'Tema claro', dark: 'Tema escuro', toggle: 'Alternar tema' },
    lang: { es: 'Español', en: 'English', 'pt-BR': 'Português (BR)', label: 'Idioma' },
    user: 'Conta'
  },
  state: { loaded: 'Com dados', empty: 'Vazio', loading: 'Carregando', error: 'Erro', label: 'Estado da vista' },
  status: {
    active: 'Ativo', paused: 'Pausado', shadow: 'Shadow', archived: 'Arquivado',
    ok: 'Saudável', warning: 'Atenção', error: 'Erro',
    success: 'Sucesso', danger: 'Risco', info: 'Info', neutral: 'Neutro'
  },
  autonomy: {
    label: 'Autonomia',
    L0: { name: 'Shadow', short: 'L0', help: 'Observa, não propõe nem executa.' },
    L1: { name: 'Propõe', short: 'L1', help: 'Propõe rascunhos, humano aprova.' },
    L2: { name: 'Auto-low', short: 'L2', help: 'Executa ações de baixo risco. Humano notificado.' },
    L3: { name: 'Auto+notif', short: 'L3', help: 'Executa e envia resumo diário.' },
    L4: { name: 'Auto+exceç', short: 'L4', help: 'Só escala exceções ao humano.' },
    locked: 'Bloqueado', nextUnlock: 'Próximo desbloqueio', criterion: 'Critério'
  },
  bandeja: {
    title: 'Caixa',
    filters: { all: 'Todos', byAgent: 'Por agente', byRisk: 'Por risco', byAge: 'Por idade' },
    empty: { title: 'Caixa em dia', subtitle: 'Última aprovação há 12 min.' },
    age: { now: 'agora', minutes: 'min', hours: 'h' },
    detail: {
      from: 'De', to: 'Para', subject: 'Assunto',
      tabs: { evidence: 'Evidência', provenance: 'Procedência', risk: 'Action-risk', trace: 'Run trace' },
      actions: { approve: 'Aprovar', edit: 'Editar', reject: 'Rejeitar', consolidate: 'Consolidar como aprendizado' },
      evidence: { empty: 'Sem spans', source: 'Fonte', version: 'Versão', lines: 'Linhas', openInKb: 'Abrir no KB' },
      risk: {
        class: 'Classe de risco', mode: 'Modo aprovação', reversible: 'Reversível',
        customer: 'Visível ao cliente', financial: 'Impacto financeiro', truth: 'Fonte da verdade',
        modes: { human_required: 'Aprovação humana', auto_low: 'Auto baixo risco', shadow: 'Shadow' },
        levels: { low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico', none: 'Nenhum' }
      },
      trace: { step: 'Passo', at: 'Hora', dur: 'Duração', ok: 'OK', fail: 'Falhou' }
    }
  },
  agent: {
    console: { title: 'Console do agente' },
    tabs: { summary: 'Resumo', skills: 'Skills', memory: 'Memória', logs: 'Logs' },
    kpis: { draftsToday: 'Drafts hoje', approved7d: 'Aprovados 7d', approvalRate7d: '% Aprov. 7d', cost7d: 'Custo 7d (USD)' },
    health: { ok: 'OK', warning: 'Atenção', error: 'Erro' },
    nextUnlock: { title: 'Próximo desbloqueio', criterion: 'Critério' },
    skills: { activeLayer: 'Camada ativa', approvalRate: 'Aprov.' },
    memory: { session: 'Sessão', project: 'Projeto', global: 'Global', forget: 'Esquecer', empty: 'Sem memórias nesta camada.' },
    logs: { empty: 'Sem runs no intervalo.' }
  },
  skill: {
    title: 'Skill Studio',
    layers: { base: 'Camada Base', manual: 'Overlay manual', learned: 'Overlay aprendido' },
    base: { sealed: 'Selada · só leitura', published: 'Publicada' },
    manual: { addRule: 'Adicionar regra', version: 'Versionar' },
    learned: {
      hot: '🔴 Quente', warm: '🟡 Morno', cold: '🔵 Frio',
      pending: 'padrões a consolidar', active: 'regras ativas', reverted: 'revertidas',
      openModal: 'Abrir consolidação'
    },
    goldSamples: { title: 'Gold samples', candidate: 'Candidato', active: 'Ativo', archived: 'Arquivado', empty: 'Sem gold samples ainda' }
  },
  workflow: {
    title: 'Workflows',
    nodes: { trigger: 'Trigger', action: 'Ação', condition: 'Condição', skill: 'Skill', output: 'Output', loop: 'Loop' },
    toolbar: { run: 'Executar', deploy: 'Publicar', fit: 'Ajustar', zoom: 'Zoom' },
    inspector: { empty: 'Selecione um nó' }
  },
  feedback: {
    title: 'Feedback do draft',
    subtitle: 'Marque a razão principal. Isto treina o agente.',
    reasons: {
      claim: { title: 'Claim sem evidência suficiente', help: 'Marca o claim_id problemático e alimenta o classificador.' },
      tone:  { title: 'Tom inadequado para o cliente',  help: 'Etiqueta o span, vai para refinement de skill.' },
      data:  { title: 'Dado incorreto ou desatualizado', help: 'Marca source_version e avisa o owner do KB.' },
      risk:  { title: 'Ação arriscada para o contexto',  help: 'Sobe risk_class do action no registry.' },
      other: { title: 'Outro',                            help: 'Vai para triagem manual, sem auto-aprendizado.' }
    },
    note: 'Nota livre (opcional)',
    submit: 'Enviar feedback', cancel: 'Cancelar'
  },
  consolidation: {
    title: 'Consolidar aprendizado',
    sections: { learned: 'O que foi aprendido', applies: 'Onde se aplica', impact: 'O que impacta', confirm: 'Confirmar / Descartar' },
    learnTypes: { knowledge: 'Conhecimento', instruction: 'Instrução', output: 'Output' },
    scopes: { user: 'Usuário', skill: 'Skill', agent: 'Agente', org: 'Organização' },
    crossSkill: 'Propagar a outras skills',
    before: 'Antes', after: 'Depois',
    accumulated: 'padrões acumulados desde',
    confirm: 'Indexar como overlay aprendido', discard: 'Descartar e manter manual'
  },
  empty: {
    generic: { title: 'Nada por aqui', subtitle: 'Quando houver dados aparecerão aqui.' },
    filtered: { title: 'Sem resultados', subtitle: 'Tente ajustar os filtros.' }
  },
  error: {
    module: { title: 'Módulo indisponível', subtitle: 'Esta vista falhou ao carregar. O resto segue funcionando.', retry: 'Tentar novamente' },
    boundary: { title: 'Algo quebrou nesta vista', subtitle: 'Reporte se persistir.' }
  },
  a11y: { skip: 'Pular ao conteúdo principal', validate: 'Validar acessibilidade', closeDialog: 'Fechar diálogo', openMenu: 'Abrir menu' }
};
