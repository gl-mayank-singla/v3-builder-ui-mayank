export const NODE_TYPES = {
  prompt: { color: '#38bdf8', icon: '💬', label: 'PROMPT' },
  variable_capture: { color: '#a78bfa', icon: '📥', label: 'VAR CAPTURE' },
  decision: { color: '#f59e0b', icon: '🔀', label: 'DECISION' },
  api: { color: '#fb923c', icon: '🌐', label: 'API' },
  tool: { color: '#34d399', icon: '🛠', label: 'TOOL' },
  update_vars: { color: '#818cf8', icon: '✏️', label: 'UPDATE VARS' },
  end: { color: '#f87171', icon: '🔴', label: 'END' },
  llm_router: { color: '#facc15', icon: '🧠', label: 'LLM ROUTER' },
}

export const ADD_NODE_GROUPS = [
  {
    label: 'COMMUNICATION',
    items: [
      { type: 'prompt', title: 'Prompt', desc: 'Display a message or ask a question' },
      { type: 'end', title: 'End', desc: 'End the conversation' },
    ],
  },
  {
    label: 'DATA',
    items: [
      { type: 'variable_capture', title: 'Variable Capture', desc: 'Extract info from user input via LLM' },
      { type: 'update_vars', title: 'Update Variables', desc: 'Set or update conversation variables' },
    ],
  },
  {
    label: 'LOGIC',
    items: [
      { type: 'decision', title: 'Decision', desc: 'Route based on conditions or rules' },
      { type: 'llm_router', title: 'LLM Router', desc: 'Intelligent routing via AI classification' },
    ],
  },
  {
    label: 'INTEGRATION',
    items: [
      { type: 'api', title: 'API', desc: 'Call an external HTTP endpoint' },
      { type: 'tool', title: 'Tool', desc: 'Run custom Python code' },
    ],
  },
]

export const SIMPLE_OUT_TYPES = ['prompt', 'variable_capture', 'api', 'tool', 'update_vars']

export const DEFAULT_FLOW_CONFIG = {
  name: 'untitled_flow',
  version: '4.0.0',
  start: '',
  variables_schema: {},
  llm_defaults: { model: 'azure:gpt-4.1-mini', instructions: [] },
  interrupts: {},
  feature_flags: { flow_engine_v3_enabled: true },
  global_instructions: { agent_persona: '' },
}

export function defaultNodeData(type, id) {
  const base = { nodeId: id, type }
  switch (type) {
    case 'prompt':
      return {
        ...base,
        say: { text: '', mode: 'deterministic', instructions: [] },
      }
    case 'variable_capture':
      return { ...base, vars: [], instructions: [] }
    case 'decision':
      return {
        ...base,
        mode: 'deterministic',
        routes: {
          cases: [{ when: [{ var: '', op: '==', value: '' }], target: { goto: '' } }],
          default: { goto: '' },
        },
        options: {},
        output_var: '',
      }
    case 'api':
      return {
        ...base,
        request: { method: 'POST', endpoint: '', headers: {}, body: {}, timeout: 30 },
        map: {},
        on_error_set: {},
      }
    case 'tool':
      return {
        ...base,
        tool_name: '',
        tool_description: '',
        tool_code: '',
        tool_args: {},
        on_error_set: {},
      }
    case 'update_vars':
      return { ...base, set: {} }
    case 'end':
      return { ...base, say: { text: '', mode: 'deterministic', instructions: [] } }
    case 'llm_router':
      return {
        ...base,
        options: {},
        listen: false,
        confidence_threshold: 0.7,
        vars: [],
        instructions: [],
      }
    default:
      return base
  }
}

export function summarizeNode(type, data) {
  const t = (data?.say?.text || '').split('\n')[0] || ''
  switch (type) {
    case 'prompt':
      return t || 'Empty message'
    case 'variable_capture':
      return (data.vars || []).join(', ') || 'No variables'
    case 'decision': {
      const n = data.routes?.cases?.length ?? 0
      const hasDef = data.routes?.default?.goto ? 1 : 0
      return `${n} case(s)${hasDef ? ' + default' : ''}`
    }
    case 'api': {
      const m = data.request?.method || 'GET'
      const ep = (data.request?.endpoint || '').slice(0, 40)
      return `${m} ${ep || '…'}`.trim()
    }
    case 'tool':
      return (data.tool_description || data.tool_name || 'No tool').slice(0, 80)
    case 'update_vars': {
      const n = Object.keys(data.set || {}).length
      return n ? `Sets ${n} variable(s)` : 'No assignments'
    }
    case 'end':
      return t || 'End'
    case 'llm_router': {
      const n = Object.keys(data.options || {}).length
      return `${n} option(s) · listen: ${data.listen ? 'true' : 'false'}`
    }
    default:
      return ''
  }
}
