/**
 * 从收货地址文本中解析地域（省/直辖市）
 */
const REGION_KEYWORDS = [
  '北京', '上海', '天津', '重庆',
  '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南',
  '四川', '贵州', '云南', '陕西', '甘肃', '青海',
  '内蒙古', '广西', '西藏', '宁夏', '新疆',
  '香港', '澳门', '台湾'
]

function extractRegionFromDetail(detail) {
  if (!detail || typeof detail !== 'string') return null
  const text = detail.trim()
  for (const keyword of REGION_KEYWORDS) {
    if (text.includes(keyword)) {
      if (['北京', '上海', '天津', '重庆'].includes(keyword)) return `${keyword}市`
      if (text.includes(`${keyword}省`)) return `${keyword}省`
      if (text.includes(`${keyword}自治区`)) return `${keyword}自治区`
      return keyword
    }
  }
  const match = text.match(/([\u4e00-\u9fa5]{2,10}?(?:省|市|自治区|特别行政区))/)
  return match ? match[1] : null
}

function extractRegionFromAddress(address) {
  if (!address || typeof address !== 'object') return null
  if (address.province) return address.province
  if (address.city) return address.city
  return extractRegionFromDetail(address.detail)
}

function regionFromIp(ip) {
  if (!ip) return null
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return '本地/内网'
  }
  return null
}

module.exports = {
  extractRegionFromDetail,
  extractRegionFromAddress,
  regionFromIp
}
