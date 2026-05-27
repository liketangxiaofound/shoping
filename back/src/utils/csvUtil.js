/**
 * 简易 CSV 解析与生成（支持 UTF-8 BOM，便于 Excel 打开中文）
 */
const BOM = '\uFEFF'

function escapeCell(val) {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(rows, headers) {
  const cols = headers || (rows[0] ? Object.keys(rows[0]) : [])
  const lines = [cols.join(',')]
  for (const row of rows) {
    lines.push(cols.map((c) => escapeCell(row[c])).join(','))
  }
  return BOM + lines.join('\r\n')
}

function parseCsv(text) {
  const raw = text.replace(/^\uFEFF/, '').trim()
  if (!raw) return { headers: [], rows: [] }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { headers: [], rows: [] }

  const parseLine = (line) => {
    const out = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"'
          i++
        } else if (ch === '"') inQ = false
        else cur += ch
      } else if (ch === '"') inQ = true
      else if (ch === ',') {
        out.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    out.push(cur.trim())
    return out
  }

  const headers = parseLine(lines[0]).map((h) => h.trim())
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line)
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? ''
    })
    return obj
  })
  return { headers, rows }
}

module.exports = { toCsv, parseCsv, BOM }
