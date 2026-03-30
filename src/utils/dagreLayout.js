import dagre from '@dagrejs/dagre'

const BASE_WIDTH = 220
const BASE_HEIGHT = 82
const HANDLE_SLOT_WIDTH = 28

function estimateNodeWidth(rfNode) {
  const type = rfNode.type
  const data = rfNode.data || {}

  let handleCount = 1
  if (type === 'decision') {
    handleCount = (data.routes?.cases?.length || 0) + 1
  } else if (type === 'llm_router') {
    handleCount = Object.keys(data.options || {}).length
  }
  return Math.max(BASE_WIDTH, handleCount * HANDLE_SLOT_WIDTH + 40)
}

export function applyDagreLayout(nodes, edges, direction = 'TB') {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    nodesep: direction === 'TB' ? 60 : 100,
    ranksep: direction === 'TB' ? 100 : 180,
    marginx: 40,
    marginy: 40,
  })

  nodes.forEach((node) => {
    const w = estimateNodeWidth(node)
    g.setNode(node.id, { width: w, height: BASE_HEIGHT })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id)
    const w = estimateNodeWidth(node)
    if (!pos) return { ...node, position: node.position || { x: 0, y: 0 } }
    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - BASE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}
