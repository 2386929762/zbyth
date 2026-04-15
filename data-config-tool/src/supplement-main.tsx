import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SupplementPage } from '@/components/SupplementPage'
import { Toaster } from '@/components/ui/toaster'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultMode="light" defaultTheme="forest">
      <SupplementPage />
      <Toaster />
    </ThemeProvider>
  </StrictMode>,
)
