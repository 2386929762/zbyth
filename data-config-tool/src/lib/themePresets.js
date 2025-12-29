/**
 * 主题预设配置
 * 提供多套主题配色方案供用户选择
 */

export const themePresets = [
    {
        id: 'default',
        name: '默认主题',
        description: '经典活力蓝色主题',
        light: {
            primary: '221.2 83.2% 53.3%',
            success: '142.1 76.2% 36.3%',
            warning: '38 92% 50%',
            danger: '0 84.2% 60.2%',
            info: '199 89% 48%',
        },
        dark: {
            primary: '217.2 91.2% 59.8%',
            success: '142.1 70.6% 45.3%',
            warning: '38 92% 50%',
            danger: '0 72.2% 50.6%',
            info: '199 89% 48%',
        },
    },
    {
        id: 'ocean',
        name: '海洋蓝',
        description: '深邃的海洋蓝色调',
        light: {
            primary: '200 98% 39%',
            success: '158 64% 52%',
            warning: '43 96% 56%',
            danger: '0 91% 71%',
            info: '188 94% 43%',
        },
        dark: {
            primary: '199 89% 48%',
            success: '158 64% 52%',
            warning: '43 96% 56%',
            danger: '0 91% 71%',
            info: '188 94% 43%',
        },
    },
    {
        id: 'forest',
        name: '森林绿',
        description: '清新自然的绿色主题',
        light: {
            primary: '142 71% 45%',
            success: '142 76% 36%',
            warning: '48 96% 53%',
            danger: '0 84% 60%',
            info: '200 98% 39%',
        },
        dark: {
            primary: '142 76% 36%',
            success: '142 71% 45%',
            warning: '48 96% 53%',
            danger: '0 72% 51%',
            info: '199 89% 48%',
        },
    },
    {
        id: 'sunset',
        name: '日落橙',
        description: '温暖的橙色调',
        light: {
            primary: '25 95% 53%',
            success: '142 76% 36%',
            warning: '48 96% 53%',
            danger: '0 84% 60%',
            info: '199 89% 48%',
        },
        dark: {
            primary: '25 95% 53%',
            success: '142 71% 45%',
            warning: '48 96% 53%',
            danger: '0 72% 51%',
            info: '199 89% 48%',
        },
    },
    {
        id: 'lavender',
        name: '薰衣草紫',
        description: '优雅的紫色主题',
        light: {
            primary: '262 83% 58%',
            success: '142 76% 36%',
            warning: '48 96% 53%',
            danger: '0 84% 60%',
            info: '199 89% 48%',
        },
        dark: {
            primary: '262 83% 58%',
            success: '142 71% 45%',
            warning: '48 96% 53%',
            danger: '0 72% 51%',
            info: '199 89% 48%',
        },
    },
    {
        id: 'rose',
        name: '玫瑰粉',
        description: '柔美的粉色主题',
        light: {
            primary: '330 81% 60%',
            success: '142 76% 36%',
            warning: '48 96% 53%',
            danger: '0 84% 60%',
            info: '199 89% 48%',
        },
        dark: {
            primary: '330 81% 60%',
            success: '142 71% 45%',
            warning: '48 96% 53%',
            danger: '0 72% 51%',
            info: '199 89% 48%',
        },
    },
];

/**
 * 应用主题颜色到 CSS 变量
 */
export function applyThemeColors(preset, mode) {
    // Check system preference if mode is system
    const effectiveMode = mode === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : mode;

    const colors = effectiveMode === 'dark' ? preset.dark : preset.light;
    const root = document.documentElement;

    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--destructive', colors.danger);

    // Also set ring match primary for consistency with previous behavior
    root.style.setProperty('--ring', colors.primary);
}

/**
 * 获取当前主题预设
 */
export function getCurrentThemePreset() {
    const savedId = localStorage.getItem('theme-preset');
    return themePresets.find(p => p.id === savedId) || themePresets[0];
}
