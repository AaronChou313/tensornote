import type { CellOutput as CellOutputType } from '../compute/types'

function textValue(value: unknown) {
  if (Array.isArray(value)) return value.join('')
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function DisplayOutput({ data }: { data: Record<string, unknown> }) {
  if (typeof data['image/png'] === 'string') {
    return <img className="cell-output__image" src={`data:image/png;base64,${data['image/png']}`} alt="Python 代码生成的图像" />
  }
  if (data['text/html']) {
    const html = textValue(data['text/html'])
    return <iframe className="cell-output__html" sandbox="" srcDoc={html} title="Python HTML 输出" />
  }
  if (data['text/plain']) return <pre>{textValue(data['text/plain'])}</pre>
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}

export function CellOutput({ outputs }: { outputs: CellOutputType[] }) {
  if (!outputs.length) return null

  return (
    <div className="cell-output">
      <p className="cell-output__label">Output</p>
      {outputs.map((output, index) => {
        if (output.type === 'stream') {
          return <pre key={index} className={output.name === 'stderr' ? 'cell-output__error' : ''}>{output.text}</pre>
        }
        if (output.type === 'error') {
          return (
            <div key={index} className="cell-output__error">
              <strong>{output.name}: {output.value}</strong>
              <pre>{output.traceback.join('\n')}</pre>
            </div>
          )
        }
        return <DisplayOutput key={index} data={output.data} />
      })}
    </div>
  )
}
