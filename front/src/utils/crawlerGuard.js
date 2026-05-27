import axios from 'axios'
import { ElMessageBox } from 'element-plus'

const TOKEN_KEY = 'crawler_verify_token'

export function getCrawlerToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setCrawlerToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function fetchChallenge() {
  const res = await axios.get('/api/anti-crawler/challenge')
  return res.data?.data
}

async function submitVerify(challengeId, answer) {
  const res = await axios.post('/api/anti-crawler/verify', { challengeId, answer })
  return res.data?.data
}

let verifyingPromise = null

/**
 * 弹出算术验证，成功后写入 X-Crawler-Token
 */
export async function promptCrawlerVerify(message) {
  if (verifyingPromise) return verifyingPromise

  verifyingPromise = (async () => {
    try {
      const challenge = await fetchChallenge()
      if (!challenge?.challengeId) throw new Error('无法获取验证题目')

      const { value } = await ElMessageBox.prompt(challenge.question, message || '人机验证', {
        confirmButtonText: '提交',
        cancelButtonText: '取消',
        inputPattern: /^\d+$/,
        inputErrorMessage: '请输入数字答案'
      })

      const result = await submitVerify(challenge.challengeId, value)
      if (result?.token) {
        setCrawlerToken(result.token)
        return true
      }
      return false
    } catch (e) {
      if (e !== 'cancel' && e?.message !== 'cancel') {
        console.warn('人机验证失败:', e)
      }
      return false
    } finally {
      verifyingPromise = null
    }
  })()

  return verifyingPromise
}

export function isCrawlerBlockedResponse(error) {
  const data = error?.response?.data
  return error?.response?.status === 429 && (data?.needVerify || data?.code === 'CRAWLER_DETECTED')
}
