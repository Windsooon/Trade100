"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sun, Moon, Monitor } from "lucide-react"
import { useState, useEffect } from "react"

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
                href="#" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
            </nav>
          </div>

          {/* Right side - Theme Toggle */}
          <div className="flex items-center">
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {theme === "light" && <Sun className="h-4 w-4" />}
                    {theme === "dark" && <Moon className="h-4 w-4" />}
                    {theme === "system" && <Monitor className="h-4 w-4" />}
                    <span className="capitalize">{theme}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  )
} 