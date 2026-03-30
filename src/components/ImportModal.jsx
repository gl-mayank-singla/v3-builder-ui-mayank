import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Typography, message } from 'antd'

const { Text } = Typography
const { TextArea } = Input

function tryParse(str) {
  try {
    const obj = JSON.parse(str)
    if (!obj || typeof obj !== 'object' || !obj.nodes) return { error: 'Missing "nodes" key' }
    const count = Object.keys(obj.nodes).length
    return { valid: true, name: obj.name || 'untitled', count }
  } catch (e) {
    return { error: e.message }
  }
}

export function ImportModal({ open, onCancel, onImport, hasExistingNodes }) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) setText('')
  }, [open])

  const parsed = useMemo(() => (text.trim() ? tryParse(text) : null), [text])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result || ''))
    reader.readAsText(file)
    e.target.value = ''
  }

  const submit = () => {
    if (hasExistingNodes) {
      Modal.confirm({
        title: 'Replace current flow?',
        content:
          'Importing will replace all current nodes, edges, and flow settings. This cannot be undone.',
        okText: 'Replace & Import',
        okButtonProps: { danger: true },
        onOk: () => doImport(),
      })
    } else {
      doImport()
    }
  }

  const doImport = () => {
    try {
      onImport(text)
      setText('')
      message.success('Flow imported')
    } catch (err) {
      message.error(err?.message || 'Invalid JSON')
    }
  }

  return (
    <Modal
      title="Import Flow JSON"
      open={open}
      onCancel={onCancel}
      width={720}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="import"
          type="primary"
          disabled={!parsed?.valid}
          onClick={submit}
        >
          Import
        </Button>,
      ]}
    >
      <Text type="secondary" className="mb-2 block text-xs">
        Paste FlowEngine V4 JSON or upload a .json file.
      </Text>
      <TextArea
        rows={18}
        className="font-mono text-xs"
        placeholder={'{ "name": "...", "nodes": { } }'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex items-center justify-between">
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
        />
        {parsed && (
          <span className="text-xs">
            {parsed.valid ? (
              <span className="text-green-600">
                Valid &middot; {parsed.count} node(s) &middot; &ldquo;{parsed.name}&rdquo;
              </span>
            ) : (
              <span className="text-red-500">Error: {parsed.error}</span>
            )}
          </span>
        )}
      </div>
    </Modal>
  )
}
