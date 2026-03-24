import { ThemeToggle } from '@/components/ThemeToggle'

export function Banner() {
    return (
      <div className="h-16 border-b flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-base font-bold text-primary-foreground">数</span>
              </div>
              <span className="text-lg font-bold text-foreground">数据源配置平台</span>
          </div>
          <ThemeToggle />
      </div>
    )
}
