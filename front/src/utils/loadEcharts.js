/**
 * 加载 ECharts（优先 npm 包，失败时回退 CDN）
 */
let echartsModule = null

export async function loadEcharts() {
  if (echartsModule) return echartsModule
  try {
    const pkgName = 'echarts'
    const mod = await import(/* @vite-ignore */ pkgName)
    echartsModule = mod.default || mod
    return echartsModule
  } catch {
    return loadEchartsFromCdn()
  }
}

function loadEchartsFromCdn() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.echarts) {
      echartsModule = window.echarts
      resolve(echartsModule)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js'
    script.async = true
    script.onload = () => {
      echartsModule = window.echarts
      resolve(echartsModule)
    }
    script.onerror = () => reject(new Error('ECharts 加载失败，请执行 npm install echarts'))
    document.head.appendChild(script)
  })
}
