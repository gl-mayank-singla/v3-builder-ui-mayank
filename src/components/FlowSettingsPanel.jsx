import { useMemo, useState } from 'react'
import { Button, Input, Select, Switch, Tabs, Typography } from 'antd'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { Text } = Typography

const VAR_TYPES = ['string', 'number', 'boolean', 'array', 'object']

const INTERRUPT_TARGETS = [
  { value: 'REITERATE', label: 'REITERATE (system)' },
  { value: 'HANDOFF', label: 'HANDOFF (system)' },
]

export function FlowSettingsPanel({ flowConfig, setFlowConfig, nodeIds, onClose }) {
  const [varFilter, setVarFilter] = useState('')
  const [expandedVar, setExpandedVar] = useState(null)
  const [expandedIntr, setExpandedIntr] = useState(null)
  const [newFlagKey, setNewFlagKey] = useState('')
  const [showNewFlagInput, setShowNewFlagInput] = useState(false)

  const varsEntries = useMemo(
    () => Object.entries(flowConfig.variables_schema || {}),
    [flowConfig.variables_schema],
  )
  const filteredVars = useMemo(() => {
    if (!varFilter.trim()) return varsEntries
    const q = varFilter.toLowerCase()
    return varsEntries.filter(
      ([name, v]) =>
        name.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q),
    )
  }, [varsEntries, varFilter])

  const intrEntries = useMemo(
    () => Object.entries(flowConfig.interrupts || {}),
    [flowConfig.interrupts],
  )

  const featureEntries = useMemo(
    () => Object.entries(flowConfig.feature_flags || {}),
    [flowConfig.feature_flags],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <Text strong>Flow Settings</Text>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>
      <Tabs
        className="flow-settings-tabs flex-1 min-h-0 px-2"
        items={[
          {
            key: 'general',
            label: 'General',
            children: (
              <div className="space-y-3 p-1 max-h-[calc(100vh-140px)] overflow-y-auto">
                <div>
                  <Text className="text-xs">Flow Name</Text>
                  <Input
                    className="mt-1"
                    value={flowConfig.name}
                    onChange={(e) =>
                      setFlowConfig((fc) => ({ ...fc, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Text className="text-xs">Version</Text>
                  <Input
                    className="mt-1"
                    disabled
                    value={flowConfig.version || '4.0.0'}
                  />
                </div>
                <div>
                  <Text className="text-xs">Start Node</Text>
                  <Select
                    className="mt-1 w-full"
                    showSearch
                    allowClear
                    placeholder="Search & select start node"
                    options={nodeIds.map((id) => ({ value: id, label: id }))}
                    value={flowConfig.start || undefined}
                    onChange={(v) =>
                      setFlowConfig((fc) => ({ ...fc, start: v || '' }))
                    }
                  />
                </div>
                <div>
                  <Text className="text-xs font-semibold">Feature Flags</Text>
                  <div className="mt-2 space-y-2">
                    {featureEntries.map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate text-xs font-mono">{key}</span>
                        <Switch
                          size="small"
                          checked={!!val}
                          onChange={(checked) =>
                            setFlowConfig((fc) => ({
                              ...fc,
                              feature_flags: {
                                ...fc.feature_flags,
                                [key]: checked,
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                    {showNewFlagInput ? (
                      <div className="flex gap-1">
                        <Input
                          size="small"
                          placeholder="flag_name"
                          value={newFlagKey}
                          autoFocus
                          onChange={(e) => setNewFlagKey(e.target.value)}
                          onPressEnter={() => {
                            const k = newFlagKey.trim()
                            if (k) {
                              setFlowConfig((fc) => ({
                                ...fc,
                                feature_flags: {
                                  ...fc.feature_flags,
                                  [k]: false,
                                },
                              }))
                            }
                            setNewFlagKey('')
                            setShowNewFlagInput(false)
                          }}
                          onBlur={() => {
                            const k = newFlagKey.trim()
                            if (k) {
                              setFlowConfig((fc) => ({
                                ...fc,
                                feature_flags: {
                                  ...fc.feature_flags,
                                  [k]: false,
                                },
                              }))
                            }
                            setNewFlagKey('')
                            setShowNewFlagInput(false)
                          }}
                        />
                      </div>
                    ) : (
                      <Button
                        size="small"
                        type="dashed"
                        onClick={() => setShowNewFlagInput(true)}
                      >
                        Add flag
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'variables',
            label: 'Variables',
            children: (
              <div className="flex flex-col gap-2 p-1 max-h-[calc(100vh-140px)]">
                <Text type="secondary" className="text-xs">
                  {varsEntries.length} variable(s)
                </Text>
                <Input.Search
                  allowClear
                  placeholder="Filter"
                  value={varFilter}
                  onChange={(e) => setVarFilter(e.target.value)}
                />
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                  {filteredVars.map(([name, spec]) => (
                    <div
                      key={name}
                      className="rounded border border-slate-100 bg-slate-50/80 p-2"
                    >
                      <button
                        type="button"
                        className="flex w-full flex-col items-start text-left"
                        onClick={() =>
                          setExpandedVar((x) => (x === name ? null : name))
                        }
                      >
                        <span className="font-semibold text-sm">{name}</span>
                        <span className="line-clamp-1 text-xs text-slate-500">
                          {spec.description || '—'}
                        </span>
                        <span className="mt-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">
                          {spec.type || 'string'}
                        </span>
                      </button>
                      {expandedVar === name && (
                        <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
                          <div>
                            <Text className="text-xs">Name</Text>
                            <Input
                              size="small"
                              className="mt-1"
                              defaultValue={name}
                              key={`var-name-${name}`}
                              onBlur={(e) => {
                                const nn = e.target.value.trim()
                                if (nn && nn !== name) {
                                  setFlowConfig((fc) => {
                                    const vs = { ...fc.variables_schema }
                                    const val = vs[name]
                                    delete vs[name]
                                    vs[nn] = val
                                    return { ...fc, variables_schema: vs }
                                  })
                                  setExpandedVar(nn)
                                }
                              }}
                              onPressEnter={(e) => {
                                const nn = e.target.value.trim()
                                if (nn && nn !== name) {
                                  setFlowConfig((fc) => {
                                    const vs = { ...fc.variables_schema }
                                    const val = vs[name]
                                    delete vs[name]
                                    vs[nn] = val
                                    return { ...fc, variables_schema: vs }
                                  })
                                  setExpandedVar(nn)
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Text className="text-xs">Type</Text>
                            <Select
                              size="small"
                              className="mt-1 w-full"
                              value={spec.type || 'string'}
                              options={VAR_TYPES.map((t) => ({ value: t }))}
                              onChange={(t) =>
                                setFlowConfig((fc) => ({
                                  ...fc,
                                  variables_schema: {
                                    ...fc.variables_schema,
                                    [name]: { ...spec, type: t },
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Text className="text-xs">Description</Text>
                            <Input
                              size="small"
                              className="mt-1"
                              value={spec.description || ''}
                              onChange={(e) =>
                                setFlowConfig((fc) => ({
                                  ...fc,
                                  variables_schema: {
                                    ...fc.variables_schema,
                                    [name]: {
                                      ...spec,
                                      description: e.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </div>
                          <Button
                            size="small"
                            danger
                            type="link"
                            onClick={() => {
                              setFlowConfig((fc) => {
                                const vs = { ...fc.variables_schema }
                                delete vs[name]
                                return { ...fc, variables_schema: vs }
                              })
                              setExpandedVar(null)
                            }}
                          >
                            Delete variable
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => {
                    let i = 1
                    let nk = `var_${i}`
                    while (flowConfig.variables_schema?.[nk]) {
                      i += 1
                      nk = `var_${i}`
                    }
                    setFlowConfig((fc) => ({
                      ...fc,
                      variables_schema: {
                        ...fc.variables_schema,
                        [nk]: { type: 'string', description: '' },
                      },
                    }))
                    setExpandedVar(nk)
                  }}
                >
                  Add Variable
                </Button>
              </div>
            ),
          },
          {
            key: 'llm',
            label: 'LLM',
            children: (
              <div className="space-y-3 p-1 max-h-[calc(100vh-140px)] overflow-y-auto">
                <div>
                  <Text className="text-xs">Default Model</Text>
                  <Input
                    className="mt-1"
                    value={flowConfig.llm_defaults?.model || ''}
                    onChange={(e) =>
                      setFlowConfig((fc) => ({
                        ...fc,
                        llm_defaults: {
                          ...fc.llm_defaults,
                          model: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Text className="text-xs">
                    Global Instructions (one per line)
                  </Text>
                  <TextArea
                    rows={5}
                    className="mt-1"
                    value={(flowConfig.llm_defaults?.instructions || []).join(
                      '\n',
                    )}
                    onChange={(e) =>
                      setFlowConfig((fc) => ({
                        ...fc,
                        llm_defaults: {
                          ...fc.llm_defaults,
                          instructions: e.target.value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Text className="text-xs">Agent Persona</Text>
                  <TextArea
                    rows={4}
                    className="mt-1"
                    value={
                      flowConfig.global_instructions?.agent_persona || ''
                    }
                    onChange={(e) =>
                      setFlowConfig((fc) => ({
                        ...fc,
                        global_instructions: {
                          ...fc.global_instructions,
                          agent_persona: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'interrupts',
            label: 'Interrupts',
            children: (
              <div className="flex flex-col gap-2 p-1 max-h-[calc(100vh-140px)]">
                <Text type="secondary" className="text-xs">
                  {intrEntries.length} interrupt(s)
                </Text>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                  {intrEntries.map(([key, spec]) => {
                    const target = spec.target?.goto || ''
                    return (
                      <div
                        key={key}
                        className="rounded border border-slate-100 p-2"
                      >
                        <button
                          type="button"
                          className="flex w-full flex-col items-start text-left"
                          onClick={() =>
                            setExpandedIntr((x) =>
                              x === key ? null : key,
                            )
                          }
                        >
                          <span className="font-semibold text-sm">{key}</span>
                          <span className="line-clamp-1 text-xs text-slate-500">
                            {spec.description || '—'}
                          </span>
                          <span className="mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                            {target || '—'}
                          </span>
                        </button>
                        {expandedIntr === key && (
                          <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
                            <div>
                              <Text className="text-xs">Key</Text>
                              <Input
                                size="small"
                                className="mt-1"
                                defaultValue={key}
                                key={`intr-key-${key}`}
                                onBlur={(e) => {
                                  const nk = e.target.value.trim()
                                  if (nk && nk !== key) {
                                    setFlowConfig((fc) => {
                                      const intr = { ...fc.interrupts }
                                      const val = intr[key]
                                      delete intr[key]
                                      intr[nk] = val
                                      return { ...fc, interrupts: intr }
                                    })
                                    setExpandedIntr(nk)
                                  }
                                }}
                                onPressEnter={(e) => {
                                  const nk = e.target.value.trim()
                                  if (nk && nk !== key) {
                                    setFlowConfig((fc) => {
                                      const intr = { ...fc.interrupts }
                                      const val = intr[key]
                                      delete intr[key]
                                      intr[nk] = val
                                      return { ...fc, interrupts: intr }
                                    })
                                    setExpandedIntr(nk)
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <Text className="text-xs">Description</Text>
                              <TextArea
                                rows={2}
                                size="small"
                                className="mt-1"
                                value={spec.description || ''}
                                onChange={(e) =>
                                  setFlowConfig((fc) => ({
                                    ...fc,
                                    interrupts: {
                                      ...fc.interrupts,
                                      [key]: {
                                        ...spec,
                                        description: e.target.value,
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Text className="text-xs">Target</Text>
                              <Select
                                className="mt-1 w-full"
                                allowClear
                                showSearch
                                options={[
                                  ...INTERRUPT_TARGETS,
                                  ...nodeIds.map((id) => ({
                                    value: id,
                                    label: id,
                                  })),
                                ]}
                                value={target || undefined}
                                onChange={(v) =>
                                  setFlowConfig((fc) => ({
                                    ...fc,
                                    interrupts: {
                                      ...fc.interrupts,
                                      [key]: {
                                        ...spec,
                                        target: v ? { goto: v } : {},
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <Button
                              size="small"
                              danger
                              type="link"
                              onClick={() => {
                                setFlowConfig((fc) => {
                                  const intr = { ...fc.interrupts }
                                  delete intr[key]
                                  return { ...fc, interrupts: intr }
                                })
                                setExpandedIntr(null)
                              }}
                            >
                              Delete interrupt
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => {
                    let i = 1
                    let nk = `interrupt_${i}`
                    while (flowConfig.interrupts?.[nk]) {
                      i += 1
                      nk = `interrupt_${i}`
                    }
                    setFlowConfig((fc) => ({
                      ...fc,
                      interrupts: {
                        ...fc.interrupts,
                        [nk]: { description: '', target: { goto: '' } },
                      },
                    }))
                    setExpandedIntr(nk)
                  }}
                >
                  Add Interrupt
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
