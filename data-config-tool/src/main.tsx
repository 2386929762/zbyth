import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/components/ThemeProvider'
import App from './App'
import './index.css'

// SDK 初始化和登录在 index.html 中完成
// 组件通过 window.sdkLoggedIn 和 sdkLoggedIn 事件来检测 SDK 状态

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultMode="light" defaultTheme="forest">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
