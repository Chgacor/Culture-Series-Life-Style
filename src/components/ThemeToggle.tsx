"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Mencegah hydration mismatch error
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="w-24 h-8 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-md"></div>

  return (
    <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg w-max">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1 text-xs rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
      >
        Light
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`px-3 py-1 text-xs rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
      >
        System
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1 text-xs rounded-md transition-all ${theme === 'dark' ? 'bg-gray-600 text-white shadow' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
      >
        Dark
      </button>
    </div>
  )
}