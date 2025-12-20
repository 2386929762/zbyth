import { createContext, useContext, useEffect, useState } from 'react'

const initialState = {
    mode: 'system',
    colorTheme: 'default',
    setMode: () => null,
    setColorTheme: () => null,
}

const ThemeProviderContext = createContext(initialState)

const STORAGE_KEY = 'system-theme'

export function ThemeProvider({
    children,
    defaultMode = 'light',
    defaultColor = 'green',
    ...props
}) {
    const [mode, setMode] = useState(
        () => localStorage.getItem(`${STORAGE_KEY}-mode`) || defaultMode
    )
    const [colorTheme, setColorTheme] = useState(
        () => localStorage.getItem(`${STORAGE_KEY}-color`) || defaultColor
    )

    useEffect(() => {
        const root = window.document.documentElement

        // Remove all mode classes
        root.classList.remove('light', 'dark')

        // Remove all theme classes
        root.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-orange', 'theme-rose')

        // Apply mode
        if (mode === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
                .matches
                ? 'dark'
                : 'light'

            root.classList.add(systemTheme)
        } else {
            root.classList.add(mode)
        }

        // Apply color theme
        if (colorTheme !== 'default') {
            root.classList.add(`theme-${colorTheme}`)
        }
    }, [mode, colorTheme])

    // 监听来自父窗口的主题变化消息
    useEffect(() => {
        const handleMessage = (e) => {
            if (e.data.type === 'THEME_CHANGE') {
                if (e.data.mode) setMode(e.data.mode)
                if (e.data.colorTheme) setColorTheme(e.data.colorTheme)
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    const value = {
        mode,
        colorTheme,
        setMode: (newMode) => {
            localStorage.setItem(`${STORAGE_KEY}-mode`, newMode)
            setMode(newMode)
        },
        setColorTheme: (newTheme) => {
            localStorage.setItem(`${STORAGE_KEY}-color`, newTheme)
            setColorTheme(newTheme)
        },
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
