import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from '@/components/ThemeProvider'

// 注意：SDK 初始化和登录已在 index.html 中完成
// 组件会监听 sdkLoggedIn 事件来加载数据

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider defaultMode="light" defaultTheme="forest">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
