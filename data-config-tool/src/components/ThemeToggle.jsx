import { Moon, Sun, Palette, Check } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { themePresets } from '@/lib/themePresets'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function ThemeToggle() {
    const { mode, themePreset, setMode, setThemePreset } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)
    const timeoutRef = useRef(null)

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        setIsOpen(true)
    }

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false)
        }, 300)
    }

    // Close click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "rounded-xl w-10 h-10 active:scale-[0.97] [&_svg]:size-4 transition-all duration-200",
                    isOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Palette className="h-4 w-4" />
                <span className="sr-only">Toggle theme</span>
            </Button>

            <div className={cn(
                "absolute right-0 top-full mt-3 w-96 bg-popover rounded-xl border border-border/40 shadow-xl p-4 z-50 origin-top-right transition-all duration-300 ease-in-out",
                isOpen
                    ? "opacity-100 scale-100 translate-y-0 visible"
                    : "opacity-0 scale-95 -translate-y-2 invisible pointer-events-none"
            )}>
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">主题风格</h4>
                        <p className="text-xs text-muted-foreground">自定义应用的外观和配色方案</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">显示模式</Label>
                        <div className="flex gap-2">
                            <Button
                                variant={mode === 'light' ? 'default' : 'outline'}
                                onClick={() => setMode('light')}
                                className={cn(
                                    "flex-1 h-10 rounded-lg",
                                    mode !== 'light' && "border-2 border-border/60 bg-transparent text-foreground hover:bg-accent/50"
                                )}
                            >
                                <Sun className="h-4 w-4 mr-2" />
                                明亮
                            </Button>
                            <Button
                                variant={mode === 'dark' ? 'default' : 'outline'}
                                onClick={() => setMode('dark')}
                                className={cn(
                                    "flex-1 h-10 rounded-lg",
                                    mode !== 'dark' && "border-2 border-border/60 bg-transparent text-foreground hover:bg-accent/50"
                                )}
                            >
                                <Moon className="h-4 w-4 mr-2" />
                                暗黑
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">配色方案</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto px-2">
                            {themePresets.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => setThemePreset(preset.id)}
                                    className={cn(
                                        "relative p-3 rounded-xl border-2 transition-all text-left group",
                                        themePreset.id === preset.id
                                            ? "border-primary bg-primary/5"
                                            : "border-border/40 hover:border-border hover:bg-accent/50"
                                    )}
                                >
                                    {themePreset.id === preset.id && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="h-3 w-3 text-primary-foreground" />
                                        </div>
                                    )}

                                    <div className="text-xs font-bold text-foreground mb-1">
                                        {preset.name}
                                    </div>

                                    <div className="text-[10px] text-muted-foreground mb-2 leading-tight">
                                        {preset.description}
                                    </div>

                                    <div className="flex gap-1">
                                        {[
                                            preset.light.primary,
                                            preset.light.success,
                                            preset.light.warning,
                                            preset.light.danger
                                        ].map((color, i) => (
                                            <div
                                                key={i}
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: `hsl(${color})` }}
                                            />
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
