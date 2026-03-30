import { useCallback, useRef, useState } from 'react'
import { Button, Input } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'

function objToTuples(obj) {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([k, v], i) => ({
    id: i,
    key: k,
    value: typeof v === 'string' ? v : JSON.stringify(v),
  }))
}

function tuplesToObj(tuples) {
  const out = {}
  tuples.forEach(({ key, value }) => {
    if (key !== undefined) out[key] = value
  })
  return out
}

export function KeyValueList({ value = {}, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }) {
  const nextId = useRef(0)
  const [rows, setRows] = useState(() => {
    const init = objToTuples(value)
    nextId.current = init.length
    return init
  })

  const prevValueRef = useRef(value)
  if (value !== prevValueRef.current) {
    const incoming = objToTuples(value)
    const currentObj = tuplesToObj(rows)
    const sameShape =
      Object.keys(value).length === Object.keys(currentObj).length &&
      Object.entries(value).every(([k, v]) => {
        const cv = currentObj[k]
        return cv !== undefined && (typeof v === 'string' ? cv === v : cv === JSON.stringify(v))
      })
    if (!sameShape) {
      nextId.current = incoming.length
      setRows(incoming.map((r, i) => ({ ...r, id: i })))
    }
    prevValueRef.current = value
  }

  const emit = useCallback(
    (updated) => {
      setRows(updated)
      onChange(tuplesToObj(updated))
    },
    [onChange],
  )

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, idx) => (
        <div key={row.id} className="flex gap-1 items-center">
          <Input
            size="small"
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(e) => {
              const updated = [...rows]
              updated[idx] = { ...updated[idx], key: e.target.value }
              emit(updated)
            }}
          />
          <Input
            size="small"
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(e) => {
              const updated = [...rows]
              updated[idx] = { ...updated[idx], value: e.target.value }
              emit(updated)
            }}
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<MinusCircleOutlined />}
            onClick={() => {
              const updated = rows.filter((_, i) => i !== idx)
              emit(updated)
            }}
          />
        </div>
      ))}
      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={() => {
          const id = nextId.current++
          emit([...rows, { id, key: '', value: '' }])
        }}
      >
        Add
      </Button>
    </div>
  )
}
