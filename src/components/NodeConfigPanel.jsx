import {
  Button,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Switch,
  Typography,
} from 'antd'
import { CloseOutlined, DeleteOutlined } from '@ant-design/icons'
import { NODE_TYPES } from '../constants'
import { KeyValueList } from './KeyValueEditors'

const { TextArea } = Input
const { Text } = Typography

function nodeSelectOptions(nodes, excludeId) {
  return nodes
    .filter((n) => n.id !== excludeId)
    .map((n) => {
      const meta = NODE_TYPES[n.type] || { icon: '•' }
      return {
        value: n.id,
        label: (
          <span>
            {meta.icon} {n.id}
          </span>
        ),
      }
    })
}

export function NodeConfigPanel({
  node,
  allNodes,
  edges,
  setNodes,
  setEdges,
  onRename,
  onDelete,
  onClose,
}) {
  if (!node) return null

  const id = node.id
  const data = node.data || {}
  const type = node.type
  const meta = NODE_TYPES[type] || { color: '#64748b', icon: '◆', label: type }

  const patchData = (partial) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...partial } } : n,
      ),
    )
  }

  const setNextTarget = (targetId) => {
    setEdges((es) => {
      const rest = es.filter((e) => {
        if (e.source !== id) return true
        if (
          ['prompt', 'variable_capture', 'api', 'tool', 'update_vars'].includes(
            type,
          )
        ) {
          return false
        }
        return true
      })
      if (!targetId) return rest
      return [
        ...rest,
        {
          id: `${id}->${targetId}-default-output`,
          source: id,
          target: targetId,
          sourceHandle: 'default-output',
          label: '',
        },
      ]
    })
  }

  const getSimpleNext = () => {
    const e = edges.find((x) => x.source === id)
    return e?.target
  }

  const opts = nodeSelectOptions(allNodes, id)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <span
            className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ background: meta.color }}
          >
            {meta.label}
          </span>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      <div className="border-b border-slate-100 px-3 py-2">
        <Text type="secondary" className="text-xs">
          Node ID
        </Text>
        <Input
          size="small"
          className="mt-1 font-mono"
          defaultValue={id}
          key={id}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== id) onRename(id, v)
          }}
          onPressEnter={(e) => {
            const v = e.target.value.trim()
            if (v && v !== id) onRename(id, v)
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
        {type === 'prompt' && (
          <PromptFields
            data={data}
            patchData={patchData}
            opts={opts}
            getSimpleNext={getSimpleNext}
            setNextTarget={setNextTarget}
          />
        )}

        {type === 'variable_capture' && (
          <VarCaptureFields
            data={data}
            patchData={patchData}
            opts={opts}
            getSimpleNext={getSimpleNext}
            setNextTarget={setNextTarget}
          />
        )}

        {type === 'decision' && (
          <DecisionFields
            data={data}
            patchData={patchData}
            id={id}
            edges={edges}
            setEdges={setEdges}
            opts={opts}
          />
        )}

        {type === 'api' && (
          <ApiFields
            data={data}
            patchData={patchData}
            opts={opts}
            getSimpleNext={getSimpleNext}
            setNextTarget={setNextTarget}
          />
        )}

        {type === 'tool' && (
          <ToolFields
            data={data}
            patchData={patchData}
            opts={opts}
            getSimpleNext={getSimpleNext}
            setNextTarget={setNextTarget}
          />
        )}

        {type === 'update_vars' && (
          <UpdateVarsFields
            data={data}
            patchData={patchData}
            opts={opts}
            getSimpleNext={getSimpleNext}
            setNextTarget={setNextTarget}
          />
        )}

        {type === 'end' && <EndFields data={data} patchData={patchData} />}

        {type === 'llm_router' && (
          <LlmRouterFields
            data={data}
            patchData={patchData}
            id={id}
            edges={edges}
            setEdges={setEdges}
            opts={opts}
          />
        )}
      </div>

      <div className="border-t border-slate-100 p-3">
        <Popconfirm
          title="Delete this node and its connections?"
          onConfirm={() => onDelete(id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button danger block icon={<DeleteOutlined />}>
            Delete Node
          </Button>
        </Popconfirm>
      </div>
    </div>
  )
}

function filterNodeOption(input, option) {
  return (option?.value || '').toLowerCase().includes(input.toLowerCase())
}

function NextNodeSelect({ opts, value, onChange }) {
  return (
    <div>
      <Text className="text-xs">Next Node</Text>
      <Select
        className="mt-1 w-full"
        showSearch
        filterOption={filterNodeOption}
        allowClear
        placeholder="Search & select target"
        options={opts}
        value={value}
        onChange={(v) => onChange(v || '')}
      />
    </div>
  )
}

function SayFields({ data, patchData, sayKey = 'say' }) {
  const say = data[sayKey] || { text: '', mode: 'deterministic', instructions: [] }
  const patch = (partial) => patchData({ [sayKey]: { ...say, ...partial } })
  return (
    <>
      <div>
        <Text className="text-xs">Say Mode</Text>
        <Radio.Group
          size="small"
          className="mt-1 flex"
          value={say.mode || 'deterministic'}
          onChange={(e) => patch({ mode: e.target.value })}
        >
          <Radio.Button value="generative">Generative</Radio.Button>
          <Radio.Button value="deterministic">Deterministic</Radio.Button>
        </Radio.Group>
      </div>
      <div>
        <Text className="text-xs">Message Text</Text>
        <TextArea
          rows={4}
          className="mt-1"
          value={say.text || ''}
          onChange={(e) => patch({ text: e.target.value })}
        />
      </div>
      <div>
        <Text className="text-xs">Instructions (one per line)</Text>
        <TextArea
          rows={3}
          className="mt-1"
          value={(say.instructions || []).join('\n')}
          onChange={(e) =>
            patch({
              instructions: e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <div>
        <Text className="text-xs">Model Override</Text>
        <Input
          className="mt-1"
          placeholder="Uses flow default"
          value={say.model || ''}
          onChange={(e) => patch({ model: e.target.value || undefined })}
        />
      </div>
    </>
  )
}

function PromptFields({ data, patchData, opts, getSimpleNext, setNextTarget }) {
  return (
    <>
      <SayFields data={data} patchData={patchData} />
      <NextNodeSelect opts={opts} value={getSimpleNext()} onChange={setNextTarget} />
    </>
  )
}

function VarCaptureFields({ data, patchData, opts, getSimpleNext, setNextTarget }) {
  return (
    <>
      <div>
        <Text className="text-xs">Variables</Text>
        <Select
          mode="tags"
          className="mt-1 w-full"
          placeholder="Add variable names"
          value={data.vars || []}
          onChange={(v) => patchData({ vars: v })}
        />
      </div>
      <div>
        <Text className="text-xs">Instructions (one per line)</Text>
        <TextArea
          rows={3}
          className="mt-1"
          value={(data.instructions || []).join('\n')}
          onChange={(e) =>
            patchData({
              instructions: e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <div>
        <Text className="text-xs">Model Override</Text>
        <Input
          className="mt-1"
          placeholder="Uses flow default"
          value={data.model || ''}
          onChange={(e) => patchData({ model: e.target.value || undefined })}
        />
      </div>
      <NextNodeSelect opts={opts} value={getSimpleNext()} onChange={setNextTarget} />
    </>
  )
}

function ApiFields({ data, patchData, opts, getSimpleNext, setNextTarget }) {
  return (
    <>
      <div>
        <Text className="text-xs">Method</Text>
        <Select
          className="mt-1 w-full"
          value={data.request?.method || 'POST'}
          options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({
            value: m,
          }))}
          onChange={(v) =>
            patchData({ request: { ...data.request, method: v } })
          }
        />
      </div>
      <div>
        <Text className="text-xs">Endpoint</Text>
        <Input
          className="mt-1 font-mono text-sm"
          value={data.request?.endpoint || ''}
          onChange={(e) =>
            patchData({
              request: { ...data.request, endpoint: e.target.value },
            })
          }
        />
      </div>
      <div>
        <Text className="text-xs">Headers</Text>
        <div className="mt-1">
          <KeyValueList
            value={data.request?.headers || {}}
            onChange={(h) =>
              patchData({ request: { ...data.request, headers: h } })
            }
          />
        </div>
      </div>
      <div>
        <Text className="text-xs">Body (JSON)</Text>
        <TextArea
          rows={6}
          className="mt-1 font-mono text-xs"
          value={
            typeof data.request?.body === 'string'
              ? data.request.body
              : JSON.stringify(data.request?.body ?? {}, null, 2)
          }
          onChange={(e) => {
            const raw = e.target.value
            try {
              patchData({
                request: {
                  ...data.request,
                  body: JSON.parse(raw || '{}'),
                },
              })
            } catch {
              patchData({ request: { ...data.request, body: raw } })
            }
          }}
        />
      </div>
      <div>
        <Text className="text-xs">Timeout</Text>
        <InputNumber
          className="mt-1 w-full"
          min={1}
          value={data.request?.timeout ?? 30}
          onChange={(v) =>
            patchData({ request: { ...data.request, timeout: v ?? 30 } })
          }
        />
      </div>
      <div>
        <Text className="text-xs">Response Mapping</Text>
        <div className="mt-1">
          <KeyValueList
            value={data.map || {}}
            onChange={(m) => patchData({ map: m })}
            keyPlaceholder="Variable"
            valuePlaceholder="JSONPath"
          />
        </div>
      </div>
      <div>
        <Text className="text-xs">On Error Set</Text>
        <div className="mt-1">
          <KeyValueList
            value={data.on_error_set || {}}
            onChange={(m) => patchData({ on_error_set: m })}
          />
        </div>
      </div>
      <NextNodeSelect opts={opts} value={getSimpleNext()} onChange={setNextTarget} />
    </>
  )
}

function ToolFields({ data, patchData, opts, getSimpleNext, setNextTarget }) {
  return (
    <>
      <div>
        <Text className="text-xs">Tool Name</Text>
        <Input
          className="mt-1"
          value={data.tool_name || ''}
          onChange={(e) => patchData({ tool_name: e.target.value })}
        />
      </div>
      <div>
        <Text className="text-xs">Tool Description</Text>
        <Input
          className="mt-1"
          value={data.tool_description || ''}
          onChange={(e) => patchData({ tool_description: e.target.value })}
        />
      </div>
      <div>
        <Text className="text-xs">Tool Code</Text>
        <TextArea
          rows={12}
          className="mt-1 font-mono text-xs"
          style={{ background: '#1e293b', color: '#e2e8f0' }}
          value={data.tool_code || ''}
          onChange={(e) => patchData({ tool_code: e.target.value })}
        />
      </div>
      <div>
        <Text className="text-xs">Tool Args</Text>
        <div className="mt-1">
          <KeyValueList
            value={data.tool_args || {}}
            onChange={(m) => patchData({ tool_args: m })}
          />
        </div>
      </div>
      <div>
        <Text className="text-xs">On Error Set</Text>
        <div className="mt-1">
          <KeyValueList
            value={data.on_error_set || {}}
            onChange={(m) => patchData({ on_error_set: m })}
          />
        </div>
      </div>
      <NextNodeSelect opts={opts} value={getSimpleNext()} onChange={setNextTarget} />
    </>
  )
}

function UpdateVarsFields({ data, patchData, opts, getSimpleNext, setNextTarget }) {
  return (
    <>
      <div>
        <Text className="text-xs">Set</Text>
        <div className="mt-1">
          <KeyValueList
            value={data.set || {}}
            onChange={(m) => patchData({ set: m })}
            keyPlaceholder="Variable"
            valuePlaceholder="Value / template"
          />
        </div>
      </div>
      <NextNodeSelect opts={opts} value={getSimpleNext()} onChange={setNextTarget} />
    </>
  )
}

function EndFields({ data, patchData }) {
  return <SayFields data={data} patchData={patchData} />
}

function DecisionFields({ data, patchData, id, edges, setEdges, opts }) {
  const mode = data.mode || 'deterministic'
  const cases = data.routes?.cases || []

  const setCaseTarget = (index, targetId) => {
    const handle = `case-${index}`
    setEdges((es) => {
      const rest = es.filter(
        (e) => !(e.source === id && e.sourceHandle === handle),
      )
      if (!targetId) return rest
      return [
        ...rest,
        {
          id: `${id}->${targetId}-${handle}`,
          source: id,
          target: targetId,
          sourceHandle: handle,
          label: `Case ${index + 1}`,
        },
      ]
    })
    const nextCases = [...cases]
    nextCases[index] = {
      ...nextCases[index],
      target: { goto: targetId || '' },
    }
    patchData({ routes: { ...data.routes, cases: nextCases } })
  }

  const setDefaultTarget = (targetId) => {
    setEdges((es) => {
      const rest = es.filter(
        (e) => !(e.source === id && e.sourceHandle === 'default-route'),
      )
      if (!targetId) return rest
      return [
        ...rest,
        {
          id: `${id}->default->${targetId}`,
          source: id,
          target: targetId,
          sourceHandle: 'default-route',
          label: 'default',
          style: { strokeDasharray: '5,5' },
        },
      ]
    })
    patchData({
      routes: { ...data.routes, default: { goto: targetId || '' } },
    })
  }

  const caseTarget = (i) =>
    edges.find((e) => e.source === id && e.sourceHandle === `case-${i}`)?.target
  const defaultTarget = edges.find(
    (e) => e.source === id && e.sourceHandle === 'default-route',
  )?.target

  const removeCase = (ci) => {
    const next = cases.filter((_, j) => j !== ci)
    patchData({ routes: { ...data.routes, cases: next } })
    setEdges((es) =>
      es
        .filter(
          (e) => !(e.source === id && e.sourceHandle === `case-${ci}`),
        )
        .map((e) => {
          if (
            e.source !== id ||
            !e.sourceHandle?.startsWith('case-')
          )
            return e
          const idx = parseInt(
            String(e.sourceHandle).replace('case-', ''),
            10,
          )
          if (Number.isNaN(idx) || idx <= ci) return e
          const ni = idx - 1
          return {
            ...e,
            sourceHandle: `case-${ni}`,
            id: `${id}->case${ni}->${e.target}`,
            label: `Case ${ni + 1}`,
          }
        }),
    )
  }

  return (
    <>
      <div>
        <Text className="text-xs">Mode</Text>
        <Radio.Group
          size="small"
          className="mt-1 flex"
          value={mode}
          onChange={(e) => patchData({ mode: e.target.value })}
        >
          <Radio.Button value="deterministic">Deterministic</Radio.Button>
          <Radio.Button value="llm">LLM</Radio.Button>
        </Radio.Group>
      </div>

      {mode === 'deterministic' && (
        <div className="space-y-3">
          {cases.map((c, ci) => (
            <div
              key={ci}
              className="rounded border border-slate-200 p-2 space-y-2"
            >
              <div className="flex justify-between items-center">
                <Text className="text-xs font-semibold">Case {ci + 1}</Text>
                <Button
                  size="small"
                  type="link"
                  danger
                  onClick={() => removeCase(ci)}
                >
                  Remove
                </Button>
              </div>
              {(c.when || [{ var: '', op: '==', value: '' }]).map((w, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <Input
                      size="small"
                      placeholder="variable"
                      value={w.var}
                      onChange={(e) => {
                        const nextCases = [...cases]
                        const when = [...(nextCases[ci].when || [])]
                        when[wi] = { ...when[wi], var: e.target.value }
                        nextCases[ci] = { ...nextCases[ci], when }
                        patchData({
                          routes: { ...data.routes, cases: nextCases },
                        })
                      }}
                    />
                    <Select
                      size="small"
                      style={{ width: 70 }}
                      value={w.op || '=='}
                      options={[
                        { value: '==', label: '==' },
                        { value: '!=', label: '!=' },
                      ]}
                      onChange={(v) => {
                        const nextCases = [...cases]
                        const when = [...(nextCases[ci].when || [])]
                        when[wi] = { ...when[wi], op: v }
                        nextCases[ci] = { ...nextCases[ci], when }
                        patchData({
                          routes: { ...data.routes, cases: nextCases },
                        })
                      }}
                    />
                    <Input
                      size="small"
                      placeholder="value"
                      value={w.value}
                      onChange={(e) => {
                        const nextCases = [...cases]
                        const when = [...(nextCases[ci].when || [])]
                        when[wi] = { ...when[wi], value: e.target.value }
                        nextCases[ci] = { ...nextCases[ci], when }
                        patchData({
                          routes: { ...data.routes, cases: nextCases },
                        })
                      }}
                    />
                  </div>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      const nextCases = [...cases]
                      const when = [...(nextCases[ci].when || [])]
                      when.splice(wi, 1)
                      nextCases[ci] = { ...nextCases[ci], when }
                      patchData({
                        routes: { ...data.routes, cases: nextCases },
                      })
                    }}
                  >
                    Remove condition
                  </Button>
                </div>
              ))}
              <Button
                size="small"
                type="dashed"
                block
                onClick={() => {
                  const nextCases = [...cases]
                  const when = [...(nextCases[ci].when || [])]
                  when.push({ var: '', op: '==', value: '' })
                  nextCases[ci] = { ...nextCases[ci], when }
                  patchData({
                    routes: { ...data.routes, cases: nextCases },
                  })
                }}
              >
                Add Condition
              </Button>
              <div>
                <Text className="text-xs">Target</Text>
                <Select
                  className="mt-1 w-full"
                  showSearch
                  filterOption={filterNodeOption}
                  allowClear
                  placeholder="Search & select target"
                  options={opts}
                  value={caseTarget(ci)}
                  onChange={(v) => setCaseTarget(ci, v)}
                />
              </div>
            </div>
          ))}
          <Button
            type="dashed"
            block
            size="small"
            onClick={() => {
              patchData({
                routes: {
                  ...data.routes,
                  cases: [
                    ...cases,
                    {
                      when: [{ var: '', op: '==', value: '' }],
                      target: { goto: '' },
                    },
                  ],
                },
              })
            }}
          >
            Add Case
          </Button>
        </div>
      )}

      {mode === 'llm' && (
        <>
          <div>
            <Text className="text-xs">Options</Text>
            <div className="mt-1">
              <KeyValueList
                value={data.options || {}}
                onChange={(o) => patchData({ options: o })}
                keyPlaceholder="Option key"
                valuePlaceholder="Description"
              />
            </div>
          </div>
          <div>
            <Text className="text-xs">Output Variable</Text>
            <Input
              className="mt-1"
              value={data.output_var || ''}
              onChange={(e) => patchData({ output_var: e.target.value })}
            />
          </div>
        </>
      )}

      <div>
        <Text className="text-xs">Default Route</Text>
        <Select
          className="mt-1 w-full"
          showSearch
          filterOption={filterNodeOption}
          allowClear
          placeholder="Search & select target"
          options={opts}
          value={defaultTarget}
          onChange={(v) => setDefaultTarget(v || '')}
        />
      </div>
    </>
  )
}

function LlmRouterFields({ data, patchData, id, edges, setEdges, opts }) {
  const keys = Object.keys(data.options || {})

  const setOptionTarget = (key, targetId) => {
    const handle = `option-${key}`
    setEdges((es) => {
      const rest = es.filter(
        (e) => !(e.source === id && e.sourceHandle === handle),
      )
      if (!targetId) return rest
      return [
        ...rest,
        {
          id: `${id}->opt_${key}->${targetId}`,
          source: id,
          target: targetId,
          sourceHandle: handle,
          label: key,
        },
      ]
    })
  }

  const optionTarget = (key) =>
    edges.find(
      (e) => e.source === id && e.sourceHandle === `option-${key}`,
    )?.target

  return (
    <>
      <div className="flex items-center justify-between">
        <Text className="text-xs">Listen Mode</Text>
        <Switch
          size="small"
          checked={!!data.listen}
          onChange={(v) => patchData({ listen: v })}
        />
      </div>
      <div>
        <Text className="text-xs">Confidence Threshold</Text>
        <InputNumber
          className="mt-1 w-full"
          min={0}
          max={1}
          step={0.1}
          value={data.confidence_threshold ?? 0.7}
          onChange={(v) => patchData({ confidence_threshold: v ?? 0.7 })}
        />
      </div>
      <div>
        <Text className="text-xs">Extract Variables</Text>
        <Select
          mode="tags"
          className="mt-1 w-full"
          value={data.vars || []}
          onChange={(v) => patchData({ vars: v })}
        />
      </div>
      <div>
        <Text className="text-xs">Instructions (one per line)</Text>
        <TextArea
          rows={3}
          className="mt-1"
          value={(data.instructions || []).join('\n')}
          onChange={(e) =>
            patchData({
              instructions: e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <div>
        <Text className="text-xs">Model Override</Text>
        <Input
          className="mt-1"
          placeholder="Uses flow default"
          value={data.model || ''}
          onChange={(e) => patchData({ model: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-2">
        <Text className="text-xs font-semibold">Options</Text>
        {keys.map((key) => {
          const raw = data.options[key]
          const desc =
            typeof raw === 'string' ? raw : raw?.description || ''
          return (
            <div
              key={key}
              className="rounded border border-slate-200 p-2 space-y-2"
            >
              <div className="flex justify-between gap-1">
                <Input
                  size="small"
                  value={key}
                  onChange={(e) => {
                    const nk = e.target.value
                    const o = { ...data.options }
                    const val = o[key]
                    delete o[key]
                    o[nk] = val
                    patchData({ options: o })
                    setEdges((es) =>
                      es.map((edge) => {
                        if (
                          edge.source !== id ||
                          edge.sourceHandle !== `option-${key}`
                        )
                          return edge
                        return {
                          ...edge,
                          sourceHandle: `option-${nk}`,
                          id: `${id}->opt_${nk}->${edge.target}`,
                          label: nk,
                        }
                      }),
                    )
                  }}
                />
                <Button
                  size="small"
                  danger
                  type="link"
                  onClick={() => {
                    const o = { ...data.options }
                    delete o[key]
                    patchData({ options: o })
                    setEdges((es) =>
                      es.filter(
                        (e) =>
                          !(
                            e.source === id &&
                            e.sourceHandle === `option-${key}`
                          ),
                      ),
                    )
                  }}
                >
                  Remove
                </Button>
              </div>
              <TextArea
                rows={2}
                placeholder="Description"
                value={desc}
                onChange={(e) => {
                  const o = { ...data.options }
                  const prev = o[key]
                  if (typeof prev === 'string' || prev == null)
                    o[key] = e.target.value
                  else o[key] = { ...prev, description: e.target.value }
                  patchData({ options: o })
                }}
              />
              <div>
                <Text className="text-[10px] text-slate-500">
                  Target Node (empty = route to node id matching key)
                </Text>
                <Select
                  className="mt-1 w-full"
                  showSearch
                  filterOption={filterNodeOption}
                  allowClear
                  placeholder="Search target (auto = key)"
                  options={opts}
                  value={optionTarget(key)}
                  onChange={(v) => setOptionTarget(key, v || '')}
                />
              </div>
            </div>
          )
        })}
        <Button
          type="dashed"
          block
          size="small"
          onClick={() => {
            let i = 1
            let nk = `option_${i}`
            while (data.options && data.options[nk]) {
              i += 1
              nk = `option_${i}`
            }
            patchData({ options: { ...data.options, [nk]: '' } })
          }}
        >
          Add Option
        </Button>
      </div>
    </>
  )
}
