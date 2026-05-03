import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { flowToReactFlow, reactFlowToExportPayload } from '../src/utils/flowIO.js'

const here = dirname(fileURLToPath(import.meta.url))
const samplePath = join(
  here,
  '..',
  'sample-flows',
  'star_health_v3_single_prompt.json',
)

const input = JSON.parse(readFileSync(samplePath, 'utf8'))
const { flowConfig, nodes, edges } = flowToReactFlow(input)
const out = reactFlowToExportPayload(nodes, edges, flowConfig)

const wantNodeIds = Object.keys(input.nodes).sort()
const gotNodeIds = Object.keys(out.nodes).sort()
console.log('node count match :', wantNodeIds.length === gotNodeIds.length)
console.log('node ids match   :', JSON.stringify(wantNodeIds) === JSON.stringify(gotNodeIds))

let ok = true
for (const id of wantNodeIds) {
  const a = input.nodes[id]
  const b = out.nodes[id]
  if (!b) { console.log('MISSING        :', id); ok = false; continue }
  if (a.type !== b.type) { console.log('TYPE MISMATCH  :', id); ok = false }
  if (a.type === 'single_prompt') {
    const aE = Object.keys(a.exits || {}).sort()
    const bE = Object.keys(b.exits || {}).sort()
    if (JSON.stringify(aE) !== JSON.stringify(bE)) {
      console.log('EXIT KEYS DIFF :', id, aE, '!=', bE); ok = false
    }
    for (const target of aE) {
      const ae = a.exits[target]; const be = b.exits[target] || {}
      const aKind = ae.when_llm !== undefined ? 'when_llm' : 'when'
      const bKind = be.when_llm !== undefined ? 'when_llm' : 'when'
      if (aKind !== bKind) { console.log('EXIT KIND DIFF :', id, target); ok = false }
      if (aKind === 'when_llm' && ae.when_llm !== be.when_llm) {
        console.log('WHEN_LLM TEXT DIFF:', id, target); ok = false
      }
      if (aKind === 'when' && JSON.stringify(ae.when) !== JSON.stringify(be.when)) {
        console.log('WHEN COND DIFF :', id, target); ok = false
      }
    }
    if ((a.prompt || '') !== (b.prompt || '')) { console.log('PROMPT DIFF    :', id); ok = false }
    const aEx = Object.keys(a.extract || {}).sort()
    const bEx = Object.keys(b.extract || {}).sort()
    if (JSON.stringify(aEx) !== JSON.stringify(bEx)) {
      console.log('EXTRACT KEYS DIFF :', id, aEx, '!=', bEx); ok = false
    }
    const aTools = (a.tools || []).slice().sort()
    const bTools = (b.tools || []).slice().sort()
    if (JSON.stringify(aTools) !== JSON.stringify(bTools)) {
      console.log('TOOLS DIFF     :', id); ok = false
    }
  }
}
console.log('start match    :', input.start === out.start)
console.log('overall        :', ok ? 'OK' : 'FAIL')
process.exit(ok ? 0 : 1)
