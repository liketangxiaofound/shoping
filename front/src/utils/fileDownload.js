import axios from 'axios'

/**
 * 下载需鉴权的 CSV/文件（不走 response 拦截器 unwrap）
 */
export async function downloadAuthenticatedFile(url, filename) {
  const token = localStorage.getItem('token')
  const res = await axios.get(url, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  const blob = new Blob([res.data], { type: res.headers['content-type'] || 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  URL.revokeObjectURL(link.href)
  link.remove()
}

export async function uploadCsvFile(url, file) {
  const token = localStorage.getItem('token')
  const form = new FormData()
  form.append('file', file)
  const res = await axios.post(url, form, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'multipart/form-data'
    }
  })
  return res.data
}
