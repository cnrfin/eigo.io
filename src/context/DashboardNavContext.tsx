'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export type DashboardTab = 'home' | 'booking' | 'history' | 'vocab'

/** One breadcrumb segment after "Dashboard". onClick = navigable (not the current page). */
export type Crumb = { label: string; onClick?: () => void }

type Indicators = { vocabDue: number; historyUnsummarized: number }

type NavValue = {
  activeTab: DashboardTab
  setActiveTab: (tab: DashboardTab) => void
  indicators: Indicators
  setIndicators: (i: Indicators) => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  /** Breadcrumb trail rendered in the top bar after "Dashboard". Pages set this; [] = derive from the route. */
  crumbs: Crumb[]
  setCrumbs: (c: Crumb[]) => void
}

const DashboardNavContext = createContext<NavValue | null>(null)

export function DashboardNavProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('home')
  const [indicators, setIndicators] = useState<Indicators>({ vocabDue: 0, historyUnsummarized: 0 })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  return (
    <DashboardNavContext.Provider value={{ activeTab, setActiveTab, indicators, setIndicators, mobileOpen, setMobileOpen, crumbs, setCrumbs }}>
      {children}
    </DashboardNavContext.Provider>
  )
}

export function useDashboardNav() {
  const ctx = useContext(DashboardNavContext)
  if (!ctx) throw new Error('useDashboardNav must be used within DashboardNavProvider')
  return ctx
}
