import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { performLogin } from '@/lib/sdk'

// 监听 SDK 就绪事件并自动登录（使用给定的账号）
window.addEventListener('sdkReady', async () => {
  try {
    // 使用指定的登录信息（按要求）
    await performLogin({ userName: 'admin', password: '123456' })
    console.log('[main] SDK 登录成功')
    // 登录成功后触发 sdkLoggedIn 事件，通知组件可以加载数据了
    window.sdkLoggedIn = true
    window.dispatchEvent(new Event('sdkLoggedIn'))
  } catch (e) {
    console.warn('[main] SDK 登录失败', e)
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
