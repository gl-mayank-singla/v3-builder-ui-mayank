import { DEFAULT_FLOW_CONFIG } from '../constants'
import { applyDagreLayout } from './dagreLayout'

function flowConfigFromParsed(flow) {
  return {
    name: flow.name || 'untitled_flow',
    version: flow.version || '4.0.0',
    start: flow.start || '',
    variables_schema: flow.variables_schema || {},
    llm_defaults: flow.llm_defaults || { model: '', instructions: [] },
    interrupts: flow.interrupts || {},
    feature_flags: flow.feature_flags || {},
    global_instructions: flow.global_instructions || { agent_persona: '' },
  }
}

export function flowToReactFlow(flow) {
  const flowConfig = flowConfigFromParsed(flow)
  const nodeEntries = Object.entries(flow.nodes || {})

  const rfNodes = nodeEntries.map(([id, nodeData]) => ({
    id,
    type: nodeData.type,
    position: { x: 0, y: 0 },
    data: {
      ...nodeData,
      nodeId: id,
      isStart: id === flow.start,
    },
  }))

  const rfEdges = []

  nodeEntries.forEach(([id, node]) => {
    if (node.next?.goto) {
      rfEdges.push({
        id: `${id}->${node.next.goto}-out`,
        source: id,
        target: node.next.goto,
        sourceHandle: 'default-output',
        label: '',
      })
    }

    if (node.routes?.cases) {
      node.routes.cases.forEach((c, i) => {
        if (c.target?.goto) {
          rfEdges.push({
            id: `${id}->case${i}->${c.target.goto}`,
            source: id,
            target: c.target.goto,
            sourceHandle: `case-${i}`,
            label: c.when?.map((w) => `${w.var} ${w.op} ${w.value}`).join(' & ') || `Case ${i + 1}`,
          })
        }
      })
      if (node.routes.default?.goto) {
        rfEdges.push({
          id: `${id}->default->${node.routes.default.goto}`,
          source: id,
          target: node.routes.default.goto,
          sourceHandle: 'default-route',
          label: 'default',
          style: { strokeDasharray: '5,5' },
        })
      }
    }

    if (node.type === 'llm_router' && node.options) {
      Object.entries(node.options).forEach(([key, val]) => {
        const target = typeof val === 'object' && val !== null ? val.target?.goto : key
        if (target) {
          rfEdges.push({
            id: `${id}->opt_${key}->${target}`,
            source: id,
            target,
            sourceHandle: `option-${key}`,
            label: key,
          })
        }
      })
    }
  })

  const layouted = applyDagreLayout(rfNodes, rfEdges)
  return { flowConfig, ...layouted }
}

function edgeBySourceHandle(edges, sourceId, handleId) {
  return edges.find((e) => e.source === sourceId && e.sourceHandle === handleId)
}

function firstOutgoingSimple(edges, sourceId) {
  const list = edges.filter((e) => e.source === sourceId)
  const preferred = list.find((e) => e.sourceHandle === 'default-output')
  if (preferred) return preferred
  return list[0]
}

export function reactFlowToExportPayload(nodes, edges, flowConfig) {
  const outNodes = {}

  nodes.forEach((rfNode) => {
    const id = rfNode.id
    const data = { ...(rfNode.data || {}) }
    const { nodeId: _nid, isStart: _is, ...nodeData } = data
    const type = rfNode.type
    const node = { type }

    switch (type) {
      case 'prompt': {
        node.say = nodeData.say || { text: '', mode: 'deterministic', instructions: [] }
        if (nodeData.say?.model) node.say.model = nodeData.say.model
        const ne = edgeBySourceHandle(edges, id, 'default-output') || firstOutgoingSimple(edges, id)
        if (ne) node.next = { goto: ne.target }
        if (nodeData.capture && Object.keys(nodeData.capture).length) node.capture = nodeData.capture
        break
      }
      case 'variable_capture': {
        node.vars = nodeData.vars || []
        node.instructions = nodeData.instructions || []
        if (nodeData.model) node.model = nodeData.model
        const ne = firstOutgoingSimple(edges, id)
        if (ne) node.next = { goto: ne.target }
        break
      }
      case 'decision': {
        node.mode = nodeData.mode || 'deterministic'
        const cases = nodeData.routes?.cases
          ? JSON.parse(JSON.stringify(nodeData.routes.cases))
          : []
        cases.forEach((c, i) => {
          const e = edgeBySourceHandle(edges, id, `case-${i}`)
          if (e) c.target = { goto: e.target }
          else c.target = c.target || { goto: '' }
        })
        node.routes = { cases, default: {} }
        const defE = edgeBySourceHandle(edges, id, 'default-route')
        if (defE) node.routes.default = { goto: defE.target }
        if (node.mode === 'llm') {
          if (nodeData.options && Object.keys(nodeData.options).length) node.options = nodeData.options
          if (nodeData.output_var) node.output_var = nodeData.output_var
          if (nodeData.model) node.model = nodeData.model
        }
        break
      }
      case 'llm_router': {
        const opts = {}
        const keys = Object.keys(nodeData.options || {})
        keys.forEach((key) => {
          const val = nodeData.options[key]
          const e = edgeBySourceHandle(edges, id, `option-${key}`)
          const targetGoto = e?.target
          if (typeof val === 'string') {
            if (targetGoto && targetGoto !== key) {
              opts[key] = { description: val, target: { goto: targetGoto } }
            } else {
              opts[key] = val
            }
          } else if (val && typeof val === 'object') {
            const desc = val.description ?? ''
            const tg = val.target?.goto || targetGoto
            if (tg && tg !== key) {
              opts[key] = { description: desc, target: { goto: tg } }
            } else if (desc) {
              opts[key] = desc
            } else {
              opts[key] = val
            }
          }
        })
        node.options = opts
        if (nodeData.listen !== undefined) node.listen = nodeData.listen
        if (nodeData.confidence_threshold != null) node.confidence_threshold = nodeData.confidence_threshold
        if (nodeData.vars?.length) node.vars = nodeData.vars
        if (nodeData.instructions?.length) node.instructions = nodeData.instructions
        if (nodeData.model) node.model = nodeData.model
        break
      }
      case 'end': {
        node.say = nodeData.say || { text: '', mode: 'deterministic', instructions: [] }
        if (nodeData.say?.model) node.say.model = nodeData.say.model
        break
      }
      case 'api': {
        node.request = nodeData.request || {
          method: 'POST',
          endpoint: '',
          headers: {},
          body: {},
          timeout: 30,
        }
        node.map = nodeData.map || {}
        if (nodeData.on_error_set && Object.keys(nodeData.on_error_set).length) {
          node.on_error_set = nodeData.on_error_set
        }
        const ne = firstOutgoingSimple(edges, id)
        if (ne) node.next = { goto: ne.target }
        break
      }
      case 'tool': {
        node.tool_name = nodeData.tool_name || ''
        node.tool_description = nodeData.tool_description || ''
        node.tool_code = nodeData.tool_code || ''
        if (nodeData.tool_args && Object.keys(nodeData.tool_args).length) node.tool_args = nodeData.tool_args
        if (nodeData.on_error_set && Object.keys(nodeData.on_error_set).length) {
          node.on_error_set = nodeData.on_error_set
        }
        const ne = firstOutgoingSimple(edges, id)
        if (ne) node.next = { goto: ne.target }
        break
      }
      case 'update_vars': {
        node.set = nodeData.set || {}
        const ne = firstOutgoingSimple(edges, id)
        if (ne) node.next = { goto: ne.target }
        break
      }
      default:
        break
    }

    outNodes[id] = node
  })

  return {
    name: flowConfig.name,
    version: flowConfig.version || '4.0.0',
    start: flowConfig.start,
    variables_schema: flowConfig.variables_schema || {},
    llm_defaults: flowConfig.llm_defaults || { model: '', instructions: [] },
    interrupts: flowConfig.interrupts || {},
    feature_flags: flowConfig.feature_flags || {},
    global_instructions: flowConfig.global_instructions || { agent_persona: '' },
    nodes: outNodes,
  }
}

export function parseImportJson(jsonString) {
  const flow = JSON.parse(jsonString)
  return flowToReactFlow(flow)
}

export { DEFAULT_FLOW_CONFIG }
