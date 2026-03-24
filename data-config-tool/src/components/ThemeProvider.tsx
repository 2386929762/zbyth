import { createContext, useContext, useEffect, useState } from 'react'
import { themePresets, applyThemeColors, type ThemePreset } from '@/lib/themePresets'

interface ThemeProviderState {
    mode: string
    themePreset: ThemePreset
    setMode: (mode: string) => void
    setThemePreset: (presetId: string) => void
}

const initialState: ThemeProviderState = {
    mode: 'system',
    themePreset: themePresets[0],
    setMode: () => null,
    setThemePreset: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

const STORAGE_KEY_MODE = 'theme-mode'
const STORAGE_KEY_PRESET = 'theme-preset'

interface ThemeProviderProps {
    children: React.ReactNode
    defaultMode?: string
    defaultTheme?: string
}

export function ThemeProvider({
    children,
    defaultMode = 'light',
    defaultTheme = 'forest',
    ...props
}: ThemeProviderProps) {
    const [mode, setMode] = useState(
        () => localStorage.getItem(STORAGE_KEY_MODE) || defaultMode
    )

    const [themePreset, setThemePresetState] = useState<ThemePreset>(
        () => {
            const savedId = localStorage.getItem(STORAGE_KEY_PRESET) || localStorage.getItem('theme-color')
            if (savedId) {
                return themePresets.find(p => p.id === savedId) || themePresets[0]
            }
            return themePresets.find(p => p.id === defaultTheme) || themePresets[0]
        }
    )

    const setThemePreset = (presetId: string) => {
        const preset = themePresets.find(p => p.id === presetId) || themePresets[0]
        setThemePresetState(preset)
        localStorage.setItem(STORAGE_KEY_PRESET, presetId)
        localStorage.setItem('theme-color', presetId)
    }

    useEffect(() => {
        const root = window.document.documentElement

        // Remove all old mode classes just in case
        root.classList.remove('light', 'dark')

        // Apply mode class for Tailwind
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'

        const effectiveMode = mode === 'system' ? systemTheme : mode
        root.classList.add(effectiveMode)

        // Apply color variables
        applyThemeColors(themePreset, mode)

    }, [mode, themePreset])

    // 监听 localStorage 变化 (用于同源窗口/iframe间的自动同步)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY_MODE && e.newValue) {
                setMode(e.newValue)
            }
            if ((e.key === STORAGE_KEY_PRESET || e.key === 'theme-color') && e.newValue) {
                const preset = themePresets.find(p => p.id === e.newValue)
                if (preset) {
                    setThemePresetState(preset)
                }
            }
        }

        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [])

    const value: ThemeProviderState = {
        mode,
        themePreset,
        setMode: (newMode: string) => {
            localStorage.setItem(STORAGE_KEY_MODE, newMode)
            setMode(newMode)
        },
        setThemePreset,
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider')

    return context
}
