import { Moon, Sun, Monitor, Palette, Check } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const colorThemes = [
  { value: 'default', label: '默认灰', color: 'bg-slate-700' },
  { value: 'blue', label: '蓝色', color: 'bg-blue-500' },
  { value: 'green', label: '绿色', color: 'bg-green-500' },
  { value: 'purple', label: '紫色', color: 'bg-purple-500' },
  { value: 'orange', label: '橙色', color: 'bg-orange-500' },
  { value: 'rose', label: '玫瑰', color: 'bg-rose-500' },
]

export function ThemeToggle() {
  const { mode, colorTheme, setMode, setColorTheme } = useTheme()

  const getIcon = () => {
    if (mode === 'dark') return <Moon className="h-5 w-5" />
    if (mode === 'light') return <Sun className="h-5 w-5" />
    return <Monitor className="h-5 w-5" />
  }

  const getLabel = () => {
    if (mode === 'dark') return '深色'
    if (mode === 'light') return '浅色'
    return '跟随系统'
  }

  return (
    <div className="flex items-center gap-2">
      {/* Color Theme Selector */}
      <div className="relative group">
        <button className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md flex items-center gap-2 transition-colors">
          <Palette className="h-5 w-5" />
          <span className="hidden sm:inline text-sm">主题</span>
        </button>

        {/* Dropdown */}
        <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="p-2 border-b">
            <p className="text-xs font-semibold text-muted-foreground">选择颜色主题</p>
          </div>
          <div className="p-1">
            {colorThemes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => setColorTheme(theme.value)}
                className="w-full px-3 py-2 hover:bg-muted rounded-md flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${theme.color}`} />
                  <span className="text-sm">{theme.label}</span>
                </div>
                {colorTheme === theme.value && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dark/Light Mode Selector */}
      <div className="relative group">
        <button className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md flex items-center gap-2 transition-colors">
          {getIcon()}
          <span className="hidden sm:inline text-sm">{getLabel()}</span>
        </button>

        {/* Dropdown */}
        <div className="absolute right-0 mt-2 w-40 bg-card border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="p-2 border-b">
            <p className="text-xs font-semibold text-muted-foreground">选择模式</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => setMode('light')}
              className="w-full px-3 py-2 hover:bg-muted rounded-md flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Sun className="h-4 w-4" />
              <span className="text-sm">浅色</span>
              {mode === 'light' && <Check className="ml-auto h-4 w-4 text-primary" />}
            </button>
            <button
              onClick={() => setMode('dark')}
              className="w-full px-3 py-2 hover:bg-muted rounded-md flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Moon className="h-4 w-4" />
              <span className="text-sm">深色</span>
              {mode === 'dark' && <Check className="ml-auto h-4 w-4 text-primary" />}
            </button>
            <button
              onClick={() => setMode('system')}
              className="w-full px-3 py-2 hover:bg-muted rounded-md flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Monitor className="h-4 w-4" />
              <span className="text-sm">跟随系统</span>
              {mode === 'system' && <Check className="ml-auto h-4 w-4 text-primary" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
