import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { Button, Dropdown, Input, Modal, Tooltip, Typography, message } from 'antd'
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  PartitionOutlined,
  PlusOutlined,
  RedoOutlined,
  SettingOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import {
  ADD_NODE_GROUPS,
  DEFAULT_FLOW_CONFIG,
  NODE_TYPES,
  SIMPLE_OUT_TYPES,
  defaultNodeData,
} from './constants'
import { nodeTypes } from './nodes/CustomNodes'
import { NodeConfigPanel } from './components/NodeConfigPanel'
import { FlowSettingsPanel } from './components/FlowSettingsPanel'
import { ImportModal } from './components/ImportModal'
import { parseImportJson, reactFlowToExportPayload } from './utils/flowIO'
import { applyDagreLayout } from './utils/dagreLayout'
import {
  patchFlowConfigAfterRename,
  patchNodeDataAfterRename,
  remapEdgesAfterRename,
} from './utils/renameNode'

const { Text } = Typography

function cloneFlow(s) {
  return JSON.parse(JSON.stringify(s))
}

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
  style: { strokeWidth: 2, stroke: '#94a3b8' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
}

function buildAddMenuItems(onPick, getPosition) {
  return ADD_NODE_GROUPS.map((g) => ({
    type: 'group',
    label: g.label,
    children: g.items.map((it) => {
      const meta = NODE_TYPES[it.type]
      return {
        key: `${g.label}-${it.type}`,
        label: (
          <div className="py-0.5">
            <div className="text-sm font-medium">
              {meta?.icon} {it.title}
            </div>
            <div className="text-xs text-slate-500">{it.desc}</div>
          </div>
        ),
        onClick: () => onPick(it.type, getPosition()),
      }
    }),
  }))
}

function AddNodeMenu({ onPick }) {
  const { screenToFlowPosition } = useReactFlow()
  const items = useMemo(
    () =>
      buildAddMenuItems(onPick, () => {
        const cx = (window.innerWidth - 300) / 2
        const cy = window.innerHeight / 2
        return screenToFlowPosition({ x: cx, y: cy })
      }),
    [onPick, screenToFlowPosition],
  )

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button type="primary" icon={<PlusOutlined />}>
        Add Node
      </Button>
    </Dropdown>
  )
}

function AddNodeMenuStatic({ onPick }) {
  const items = useMemo(
    () => buildAddMenuItems(onPick, () => ({ x: 120, y: 160 })),
    [onPick],
  )
  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button type="primary" icon={<PlusOutlined />}>
        Add Node
      </Button>
    </Dropdown>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-lg">
            <div className="mb-2 text-3xl">&#9888;</div>
            <h2 className="mb-2 text-lg font-semibold text-slate-800">
              Something went wrong
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <Button
              type="primary"
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
            >
              Reload
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function minimapNodeColor(node) {
  const meta = NODE_TYPES[node.type]
  return meta?.color || '#94a3b8'
}

function downloadJson(payload) {
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const parsed = JSON.parse(payload)
  a.download = `${parsed.name || 'flow'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function FlowBuilder() {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState([])
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [showFlowSettings, setShowFlowSettings] = useState(false)
  const [flowConfig, setFlowConfig] = useState(() => ({ ...DEFAULT_FLOW_CONFIG }))
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportText, setExportText] = useState('')

  const { fitView } = useReactFlow()

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  const pastRef = useRef([])
  const futureRef = useRef([])
  const dragSnapshotTaken = useRef(false)

  const takeSnapshot = useCallback(() => {
    pastRef.current.push({
      nodes: cloneFlow(nodesRef.current),
      edges: cloneFlow(edgesRef.current),
    })
    if (pastRef.current.length > 80) pastRef.current.shift()
    futureRef.current = []
  }, [])

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    const now = {
      nodes: cloneFlow(nodesRef.current),
      edges: cloneFlow(edgesRef.current),
    }
    const prev = pastRef.current.pop()
    futureRef.current.unshift(now)
    setNodes(prev.nodes)
    setEdges(prev.edges)
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const now = {
      nodes: cloneFlow(nodesRef.current),
      edges: cloneFlow(edgesRef.current),
    }
    const next = futureRef.current.shift()
    pastRef.current.push(now)
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [setNodes, setEdges])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        if (e.key === 'Escape') {
          setSelectedNodeId(null)
          setShowFlowSettings(false)
        }
        return
      }
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null)
        setShowFlowSettings(false)
        setNodes((ns) => ns.map((n) => ({ ...n, selected: false })))
      }
      if (meta && e.key === 'a') {
        e.preventDefault()
        setNodes((ns) => ns.map((n) => ({ ...n, selected: true })))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, setNodes])

  useEffect(() => {
    setNodes((ns) =>
      ns.map((n) => ({
        ...n,
        data: { ...n.data, isStart: n.id === flowConfig.start },
      })),
    )
  }, [flowConfig.start, setNodes])

  const onNodesChange = useCallback(
    (changes) => {
      if (changes.some((c) => c.type === 'remove')) takeSnapshot()
      onNodesChangeBase(changes)
    },
    [onNodesChangeBase, takeSnapshot],
  )

  const onEdgesChange = useCallback(
    (changes) => {
      if (changes.some((c) => c.type === 'remove')) takeSnapshot()
      onEdgesChangeBase(changes)
    },
    [onEdgesChangeBase, takeSnapshot],
  )

  const isValidConnection = useCallback((connection) => {
    if (!connection.source || !connection.target) return false
    if (connection.source === connection.target) return false
    const sourceNode = nodesRef.current.find(
      (n) => n.id === connection.source,
    )
    if (sourceNode?.type === 'end') return false
    if (SIMPLE_OUT_TYPES.includes(sourceNode?.type)) {
      const existing = edgesRef.current.filter(
        (e) => e.source === connection.source,
      )
      if (existing.length > 0) return false
    }
    const dup = edgesRef.current.some(
      (e) =>
        e.source === connection.source &&
        (e.sourceHandle ?? 'default') ===
          (connection.sourceHandle ?? 'default'),
    )
    if (dup) return false
    return true
  }, [])

  const onConnect = useCallback(
    (params) => {
      takeSnapshot()
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            ...defaultEdgeOptions,
            id: `${params.source}->${params.target}-${params.sourceHandle || 'out'}`,
          },
          eds,
        ),
      )
    },
    [setEdges, takeSnapshot],
  )

  const onNodeDragStart = useCallback(() => {
    if (!dragSnapshotTaken.current) {
      takeSnapshot()
      dragSnapshotTaken.current = true
    }
  }, [takeSnapshot])

  const onNodeDragStop = useCallback(() => {
    dragSnapshotTaken.current = false
  }, [])

  const onNodeClick = useCallback((_, n) => {
    setShowFlowSettings(false)
    setSelectedNodeId(n.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  )

  const styledEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        style: {
          ...defaultEdgeOptions.style,
          ...(e.style || {}),
          ...(e.selected
            ? { stroke: '#3b82f6', strokeWidth: 3 }
            : {}),
        },
        markerEnd: e.selected
          ? { type: MarkerType.ArrowClosed, color: '#3b82f6' }
          : defaultEdgeOptions.markerEnd,
      })),
    [edges],
  )

  const nextNodeId = useCallback((type) => {
    let i = 1
    let id = `${type}_${i}`
    while (nodesRef.current.some((n) => n.id === id)) {
      i += 1
      id = `${type}_${i}`
    }
    return id
  }, [])

  const handleAddNode = useCallback(
    (type, position) => {
      takeSnapshot()
      const id = nextNodeId(type)
      const data = defaultNodeData(type, id)
      data.isStart = id === flowConfig.start
      const newNode = {
        id,
        type,
        position: position || { x: 120, y: 120 },
        data,
      }
      setNodes((ns) => [...ns, newNode])
      setSelectedNodeId(id)
      setShowFlowSettings(false)
    },
    [flowConfig.start, nextNodeId, setNodes, takeSnapshot],
  )

  const handleRenameNode = useCallback(
    (oldId, newId) => {
      if (!newId || newId === oldId) return
      if (nodesRef.current.some((n) => n.id === newId)) {
        message.error('That node ID is already in use')
        return
      }
      takeSnapshot()
      const fc = patchFlowConfigAfterRename(flowConfig, oldId, newId)
      setFlowConfig(fc)
      setNodes((ns) =>
        ns
          .map((n) => {
            if (n.id === oldId) {
              return {
                ...n,
                id: newId,
                data: {
                  ...patchNodeDataAfterRename(n.data, oldId, newId),
                  nodeId: newId,
                },
              }
            }
            return {
              ...n,
              data: patchNodeDataAfterRename(n.data, oldId, newId),
            }
          })
          .map((n) => ({
            ...n,
            data: { ...n.data, isStart: n.id === fc.start },
          })),
      )
      setEdges((es) => remapEdgesAfterRename(es, oldId, newId))
      setSelectedNodeId(newId)
    },
    [flowConfig, setEdges, setNodes, takeSnapshot],
  )

  const handleDeleteNode = useCallback(
    (nodeId) => {
      takeSnapshot()
      setNodes((ns) => ns.filter((n) => n.id !== nodeId))
      setEdges((es) =>
        es.filter((e) => e.source !== nodeId && e.target !== nodeId),
      )
      setFlowConfig((fc) => ({
        ...fc,
        start: fc.start === nodeId ? '' : fc.start,
      }))
      setSelectedNodeId(null)
    },
    [setEdges, setNodes, takeSnapshot],
  )

  const handleImport = useCallback(
    (jsonText) => {
      takeSnapshot()
      const {
        flowConfig: fc,
        nodes: n,
        edges: ed,
      } = parseImportJson(jsonText)
      setFlowConfig(fc)
      setNodes(n)
      setEdges(ed)
      setSelectedNodeId(null)
      setShowFlowSettings(false)
      setImportOpen(false)
      setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 100)
    },
    [setEdges, setNodes, takeSnapshot, fitView],
  )

  const handleAutoLayout = useCallback(() => {
    takeSnapshot()
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    const { nodes: ln, edges: le } = applyDagreLayout(
      currentNodes,
      currentEdges,
      'TB',
    )
    setNodes(ln)
    setEdges(le)
    setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50)
  }, [fitView, setEdges, setNodes, takeSnapshot])

  const handleExport = useCallback(() => {
    const payload = reactFlowToExportPayload(nodes, edges, flowConfig)
    setExportText(JSON.stringify(payload, null, 2))
    setExportOpen(true)
  }, [nodes, edges, flowConfig])

  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes])
  const empty = nodes.length === 0

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
        <Input
          className="max-w-[200px] font-medium"
          value={flowConfig.name}
          onChange={(e) =>
            setFlowConfig((fc) => ({ ...fc, name: e.target.value }))
          }
          placeholder="Flow name"
        />
        <Tooltip title="Flow settings">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => {
              setShowFlowSettings(true)
              setSelectedNodeId(null)
            }}
          />
        </Tooltip>
        <div className="flex-1" />
        <Button
          icon={<CloudUploadOutlined />}
          onClick={() => setImportOpen(true)}
        >
          Import
        </Button>
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          onClick={handleExport}
        >
          Export
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">
          {empty && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/80">
              <div className="text-4xl opacity-30">&#9881;</div>
              <Text className="text-slate-500 text-base">
                Import a flow JSON or add your first node to get started
              </Text>
              <div className="pointer-events-auto flex gap-2">
                <Button
                  type="primary"
                  onClick={() => setImportOpen(true)}
                >
                  Import JSON
                </Button>
                <AddNodeMenuStatic onPick={handleAddNode} />
              </div>
            </div>
          )}

          <ReactFlow
            className="h-full w-full"
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            deleteKeyCode={['Backspace', 'Delete']}
            selectionKeyCode={null}
            defaultEdgeOptions={defaultEdgeOptions}
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2}
          >
            {!empty && (
              <Panel position="top-left" className="m-2 flex gap-1.5">
                <AddNodeMenu onPick={handleAddNode} />
                <Tooltip title="Auto layout (TB)">
                  <Button
                    icon={<PartitionOutlined />}
                    onClick={handleAutoLayout}
                  />
                </Tooltip>
                <Tooltip title="Undo (Ctrl+Z)">
                  <Button icon={<UndoOutlined />} onClick={undo} />
                </Tooltip>
                <Tooltip title="Redo (Ctrl+Shift+Z)">
                  <Button icon={<RedoOutlined />} onClick={redo} />
                </Tooltip>
              </Panel>
            )}
            <Background gap={16} size={1} color="#e2e8f0" />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap
              position="bottom-right"
              zoomable
              pannable
              nodeStrokeWidth={2}
              nodeColor={minimapNodeColor}
              className="!bg-white/90 !border !border-slate-200 !shadow-sm"
            />
          </ReactFlow>
        </div>

        {(selectedNode || showFlowSettings) && (
          <div className="w-[300px] shrink-0 overflow-hidden border-l border-slate-200 bg-white shadow-sm">
            {showFlowSettings ? (
              <FlowSettingsPanel
                flowConfig={flowConfig}
                setFlowConfig={setFlowConfig}
                nodeIds={nodeIds}
                onClose={() => setShowFlowSettings(false)}
              />
            ) : (
              <NodeConfigPanel
                node={selectedNode}
                allNodes={nodes}
                edges={edges}
                setNodes={setNodes}
                setEdges={setEdges}
                onRename={handleRenameNode}
                onDelete={handleDeleteNode}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </div>
        )}
      </div>

      <ImportModal
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onImport={handleImport}
        hasExistingNodes={nodes.length > 0}
      />

      <Modal
        title="Exported Flow JSON"
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        width={800}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => downloadJson(exportText)}
          >
            Download .json
          </Button>,
          <Button
            key="copy"
            type="primary"
            onClick={() => {
              navigator.clipboard.writeText(exportText)
              message.success('Copied to clipboard')
            }}
          >
            Copy
          </Button>,
          <Button key="close" onClick={() => setExportOpen(false)}>
            Close
          </Button>,
        ]}
      >
        <Input.TextArea
          rows={22}
          className="font-mono text-xs"
          readOnly
          value={exportText}
        />
      </Modal>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <FlowBuilder />
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
