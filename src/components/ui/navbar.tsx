"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"


export function Navbar() {
  // Theme is now locked to dark mode via ThemeProvider

  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Brand and Navigation - Left aligned */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold navbar-brand">
              Trade100
            </Link>
            
            {/* Navigation - moved to left side */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/activity"
                className="text-sm font-medium transition-colors hover:opacity-80 navbar-link"
              >
                Activity
              </Link>
            </nav>
          </div>

          {/* Right side - GitHub link and Theme Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-9 w-9 p-0"
            >
              <a
                href="https://github.com/Windsooon/Trade100/"
                target="_blank"
                rel="noopener noreferrer"
                title="View on GitHub"
              >
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </a>
            </Button>

          </div>
        </div>
      </div>
    </header>
  )
} 