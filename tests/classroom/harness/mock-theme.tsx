import * as React from 'react'
const g = globalThis as any
export function useTheme() { const [theme, set] = React.useState('dark'); return { theme, toggleTheme: () => { g.log.push('toggleTheme'); set((t) => (t === 'dark' ? 'light' : 'dark')) } } }
