"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sun, Moon, Monitor } from "lucide-react"
import { useState, useEffect } from "react"
import { ThemeToggle } from './theme-toggle'

export function Navbar() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('trade100-theme') || 'dark'
    }
    return 'dark'
  })

  // Apply theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trade100-theme', theme)
      document.documentElement.classList.remove('light', 'dark')
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        document.documentElement.classList.add(systemTheme)
      } else {
        document.documentElement.classList.add(theme)
      }
    }
  }, [theme])

  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Brand and Navigation - Left aligned */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-primary">
              Trade100
            </Link>
            
            {/* Navigation - moved to left side */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Markets
              </Link>
              <Link
                href="/activity"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Activity
              </Link>
            </nav>
          </div>

          {/* Right side - Theme Toggle */}
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
} 