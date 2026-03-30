import { Handle, Position } from '@xyflow/react'
import { NODE_TYPES, summarizeNode } from '../constants'

function NodeCard({ id, data, type, selected, children, sourceHandles }) {
  const meta = NODE_TYPES[type] || { color: '#64748b', icon: '◆', label: type }
  const summary = summarizeNode(type, data)
  const isStart = data?.isStart

  return (
    <div
      style={{
        width: 220,
        borderRadius: 8,
        background: '#fff',
        boxShadow: selected
          ? `0 0 0 2px ${meta.color}, 0 4px 12px rgba(0,0,0,0.15)`
          : '0 1px 3px rgba(0,0,0,0.12)',
        position: 'relative',
        fontSize: 12,
        border: `1px solid ${isStart ? '#22c55e' : selected ? meta.color : '#e2e8f0'}`,
        borderTop: `4px solid ${meta.color}`,
        outline: isStart ? '2px solid rgba(34, 197, 94, 0.45)' : undefined,
        outlineOffset: isStart ? 2 : undefined,
        cursor: 'grab',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      {isStart && (
        <span
          className="absolute -top-2.5 left-2 z-10 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ background: '#22c55e' }}
        >
          START
        </span>
      )}
      <div className="px-3 pt-2 pb-2">
        <div className="flex items-center gap-1" style={{ color: meta.color }}>
          <span className="text-base leading-none">{meta.icon}</span>
          <span className="text-[10px] font-bold tracking-wide">{meta.label}</span>
        </div>
        <div className="mt-0.5 truncate text-sm font-bold text-slate-800">{id}</div>
        <div className="mt-0.5 truncate text-[11px] text-slate-500" title={summary}>
          {summary}
        </div>
      </div>
      {children}
      {sourceHandles}
    </div>
  )
}

function SimpleNode({ id, data, type, selected }) {
  return (
    <NodeCard id={id} data={data} type={type} selected={selected}>
      <Handle type="target" position={Position.Top} id="default-target" className="!bg-slate-400 !w-2.5 !h-2.5 !-top-[5px]" />
      <Handle type="source" position={Position.Bottom} id="default-output" className="!bg-slate-400 !w-2.5 !h-2.5 !-bottom-[5px]" />
    </NodeCard>
  )
}

export function PromptNode(props) {
  return <SimpleNode {...props} />
}

export function VariableCaptureNode(props) {
  return <SimpleNode {...props} />
}

export function ApiNode(props) {
  return <SimpleNode {...props} />
}

export function ToolNode(props) {
  return <SimpleNode {...props} />
}

export function UpdateVarsNode(props) {
  return <SimpleNode {...props} />
}

export function EndNode({ id, data, type, selected }) {
  return (
    <NodeCard id={id} data={data} type={type} selected={selected}>
      <Handle type="target" position={Position.Top} id="default-target" className="!bg-slate-400 !w-2.5 !h-2.5 !-top-[5px]" />
    </NodeCard>
  )
}

export function DecisionNode({ id, data, type, selected }) {
  const cases = data?.routes?.cases || []
  const n = cases.length
  const total = n + 1

  return (
    <NodeCard
      id={id}
      data={data}
      type={type}
      selected={selected}
      sourceHandles={
        <>
          {cases.map((c, i) => {
            const label =
              c.when?.map((w) => `${w.var || '?'} ${w.op} ${w.value || '?'}`).join(' & ') ||
              `Case ${i + 1}`
            return (
              <Handle
                key={`case-${i}`}
                type="source"
                position={Position.Bottom}
                id={`case-${i}`}
                className="!bg-amber-500 !w-2.5 !h-2.5 !border-0 !-bottom-[5px]"
                style={{ left: `${((i + 1) / (total + 1)) * 100}%` }}
                title={label}
              />
            )
          })}
          <Handle
            type="source"
            position={Position.Bottom}
            id="default-route"
            className="!bg-slate-400 !w-2.5 !h-2.5 !border-0 !-bottom-[5px]"
            style={{ left: `${((n + 1) / (total + 1)) * 100}%` }}
            title="default"
          />
        </>
      }
    >
      <Handle type="target" position={Position.Top} id="default-target" className="!bg-slate-400 !w-2.5 !h-2.5 !-top-[5px]" />
      <div className="flex pointer-events-none justify-around px-3 pb-1 pt-0.5 text-center">
        {cases.map((_, i) => (
          <div key={i} className="truncate text-[9px] leading-tight text-slate-500" title={`case ${i + 1}`}>
            {i + 1}
          </div>
        ))}
        <div className="truncate text-[9px] leading-tight text-amber-700">def</div>
      </div>
    </NodeCard>
  )
}

export function LlmRouterNode({ id, data, type, selected }) {
  const keys = Object.keys(data?.options || {})

  return (
    <NodeCard
      id={id}
      data={data}
      type={type}
      selected={selected}
      sourceHandles={
        <>
          {keys.map((key, i) => (
            <Handle
              key={key}
              type="source"
              position={Position.Bottom}
              id={`option-${key}`}
              className="!bg-yellow-500 !w-2.5 !h-2.5 !border-0 !-bottom-[5px]"
              style={{ left: `${((i + 1) / (keys.length + 1)) * 100}%` }}
              title={key}
            />
          ))}
        </>
      }
    >
      <Handle type="target" position={Position.Top} id="default-target" className="!bg-slate-400 !w-2.5 !h-2.5 !-top-[5px]" />
      <div className="flex pointer-events-none flex-wrap justify-around px-3 pb-1 pt-0.5 text-center gap-x-1">
        {keys.map((key) => (
          <div key={key} className="truncate text-[9px] leading-tight text-slate-600 max-w-[50px]" title={key}>
            {key}
          </div>
        ))}
      </div>
    </NodeCard>
  )
}

export const nodeTypes = {
  prompt: PromptNode,
  variable_capture: VariableCaptureNode,
  decision: DecisionNode,
  api: ApiNode,
  tool: ToolNode,
  update_vars: UpdateVarsNode,
  end: EndNode,
  llm_router: LlmRouterNode,
}
