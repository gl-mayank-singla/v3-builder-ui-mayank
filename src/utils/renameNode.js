function patchGotoRefs(value, oldId, newId) {
  if (value == null) return value
  if (typeof value === 'string' && value === oldId) return newId
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => patchGotoRefs(v, oldId, newId))
  const next = { ...value }
  if (next.goto === oldId) next.goto = newId
  for (const k of Object.keys(next)) {
    next[k] = patchGotoRefs(next[k], oldId, newId)
  }
  return next
}

/** Patch node.data (excluding nodeId) for references to oldId → newId */
export function patchNodeDataAfterRename(data, oldId, newId) {
  if (!data) return data
  let d = { ...data }

  if (d.next?.goto === oldId) {
    d = { ...d, next: { ...d.next, goto: newId } }
  }

  if (d.routes) {
    d = {
      ...d,
      routes: patchGotoRefs(d.routes, oldId, newId),
    }
  }

  if (d.options && typeof d.options === 'object' && !Array.isArray(d.options)) {
    const patched = {}
    for (const [k, v] of Object.entries(d.options)) {
      const nk = k === oldId ? newId : k
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const nv = { ...v }
        if (nv.target?.goto === oldId) nv.target = { ...nv.target, goto: newId }
        patched[nk] = nv
      } else {
        patched[nk] = v
      }
    }
    d = { ...d, options: patched }
  }

  return d
}

export function patchFlowConfigAfterRename(flowConfig, oldId, newId) {
  const fc = { ...flowConfig }
  if (fc.start === oldId) fc.start = newId
  if (fc.interrupts && typeof fc.interrupts === 'object') {
    const intr = {}
    for (const [key, val] of Object.entries(fc.interrupts)) {
      intr[key] = patchGotoRefs(val, oldId, newId)
    }
    fc.interrupts = intr
  }
  return fc
}

export function remapEdgesAfterRename(edges, oldId, newId) {
  return edges.map((e) => {
    const source = e.source === oldId ? newId : e.source
    const target = e.target === oldId ? newId : e.target
    const id =
      e.sourceHandle != null
        ? `${source}->${target}-${e.sourceHandle}`
        : `${source}->${target}`
    return { ...e, id, source, target }
  })
}
