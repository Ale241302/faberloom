export default {
  app: { name: 'FaberLoom', tagline: 'Agent control plane with evidence' },
  nav: {
    dashboard: 'Dashboard', bandeja: 'Inbox', agentes: 'Agents',
    skills: 'Skills', workflows: 'Workflows', conexiones: 'Connections',
    admin: 'Admin', settings: 'Settings', factory: 'Factory'
  },
  topbar: {
    search: 'Search or run (⌘K)…',
    theme: { light: 'Light theme', dark: 'Dark theme', toggle: 'Toggle theme' },
    lang: { es: 'Español', en: 'English', 'pt-BR': 'Português (BR)', label: 'Language' },
    user: 'Account'
  },
  state: { loaded: 'Loaded', empty: 'Empty', loading: 'Loading', error: 'Error', label: 'View state' },
  status: {
    active: 'Active', paused: 'Paused', shadow: 'Shadow', archived: 'Archived',
    ok: 'Healthy', warning: 'Warning', error: 'Error',
    success: 'Success', danger: 'Risk', info: 'Info', neutral: 'Neutral'
  },
  autonomy: {
    label: 'Autonomy',
    L0: { name: 'Shadow', short: 'L0', help: 'Observes, does not propose nor execute.' },
    L1: { name: 'Proposes', short: 'L1', help: 'Drafts proposals, human approves.' },
    L2: { name: 'Auto-low', short: 'L2', help: 'Executes low-risk actions. Human notified.' },
    L3: { name: 'Auto+notify', short: 'L3', help: 'Executes and sends daily summary.' },
    L4: { name: 'Auto+except', short: 'L4', help: 'Only escalates exceptions to human.' },
    locked: 'Locked', nextUnlock: 'Next unlock', criterion: 'Criterion'
  },
  bandeja: {
    title: 'Inbox',
    filters: { all: 'All', byAgent: 'By agent', byRisk: 'By risk', byAge: 'By age' },
    empty: { title: 'Inbox clear', subtitle: 'Last approval 12 min ago.' },
    age: { now: 'now', minutes: 'min', hours: 'h' },
    detail: {
      from: 'From', to: 'To', subject: 'Subject',
      tabs: { evidence: 'Evidence', provenance: 'Provenance', risk: 'Action-risk', trace: 'Run trace' },
      actions: { approve: 'Approve', edit: 'Edit', reject: 'Reject', consolidate: 'Consolidate as learning' },
      evidence: { empty: 'No spans', source: 'Source', version: 'Version', lines: 'Lines', openInKb: 'Open in KB' },
      risk: {
        class: 'Risk class', mode: 'Approval mode', reversible: 'Reversible',
        customer: 'Customer-visible', financial: 'Financial impact', truth: 'Source of truth',
        modes: { human_required: 'Human approval', auto_low: 'Auto low-risk', shadow: 'Shadow' },
        levels: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical', none: 'None' }
      },
      trace: { step: 'Step', at: 'Time', dur: 'Duration', ok: 'OK', fail: 'Failed' }
    }
  },
  agent: {
    console: { title: 'Agent Console' },
    tabs: { summary: 'Summary', skills: 'Skills', memory: 'Memory', logs: 'Logs' },
    kpis: { draftsToday: 'Drafts today', approved7d: 'Approved 7d', approvalRate7d: 'Approval 7d', cost7d: 'Cost 7d (USD)' },
    health: { ok: 'OK', warning: 'Warning', error: 'Error' },
    nextUnlock: { title: 'Next unlock', criterion: 'Criterion' },
    skills: { activeLayer: 'Active layer', approvalRate: 'Approval' },
    memory: { session: 'Session', project: 'Project', global: 'Global', forget: 'Forget', empty: 'No memories in this layer.' },
    logs: { empty: 'No runs in range.' }
  },
  skill: {
    title: 'Skill Studio',
    layers: { base: 'Base layer', manual: 'Manual overlay', learned: 'Learned overlay' },
    base: { sealed: 'Sealed · read-only', published: 'Published' },
    manual: { addRule: 'Add rule', version: 'Version' },
    learned: {
      hot: '🔴 Hot', warm: '🟡 Warm', cold: '🔵 Cold',
      pending: 'patterns pending', active: 'active rules', reverted: 'reverted',
      openModal: 'Open consolidation'
    },
    goldSamples: { title: 'Gold samples', candidate: 'Candidate', active: 'Active', archived: 'Archived', empty: 'No gold samples yet' }
  },
  workflow: {
    title: 'Workflows',
    nodes: { trigger: 'Trigger', action: 'Action', condition: 'Condition', skill: 'Skill', output: 'Output', loop: 'Loop' },
    toolbar: { run: 'Run', deploy: 'Deploy', fit: 'Fit', zoom: 'Zoom' },
    inspector: { empty: 'Select a node' }
  },
  feedback: {
    title: 'Draft feedback',
    subtitle: 'Pick the main reason. This trains the agent.',
    reasons: {
      claim: { title: 'Claim without enough evidence', help: 'Marks the offending claim_id and feeds the classifier.' },
      tone:  { title: 'Tone off for this customer',    help: 'Tags the span, goes to skill refinement.' },
      data:  { title: 'Incorrect or stale data',       help: 'Marks source_version and pings KB owner.' },
      risk:  { title: 'Action too risky for context',  help: 'Raises risk_class in registry.' },
      other: { title: 'Other',                          help: 'Goes to manual triage, no auto-learning.' }
    },
    note: 'Free note (optional)',
    submit: 'Submit feedback', cancel: 'Cancel'
  },
  consolidation: {
    title: 'Consolidate learning',
    sections: { learned: 'What was learned', applies: 'Where it applies', impact: 'What it impacts', confirm: 'Confirm / Discard' },
    learnTypes: { knowledge: 'Knowledge', instruction: 'Instruction', output: 'Output' },
    scopes: { user: 'User', skill: 'Skill', agent: 'Agent', org: 'Organization' },
    crossSkill: 'Propagate to other skills',
    before: 'Before', after: 'After',
    accumulated: 'patterns accumulated since',
    confirm: 'Index as learned overlay', discard: 'Discard and keep manual'
  },
  empty: {
    generic: { title: 'Nothing here yet', subtitle: 'Data will show up here when available.' },
    filtered: { title: 'No results', subtitle: 'Try adjusting the filters.' }
  },
  error: {
    module: { title: 'Module unavailable', subtitle: 'This view failed to load. The rest still works.', retry: 'Retry' },
    boundary: { title: 'Something broke in this view', subtitle: 'Report if it persists.' }
  },
  a11y: { skip: 'Skip to main content', validate: 'Validate accessibility', closeDialog: 'Close dialog', openMenu: 'Open menu' }
};
