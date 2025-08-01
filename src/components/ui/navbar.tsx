"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"
import { SettingsSheet } from "@/components/ui/settings-sheet"
import { SearchDropdown } from "@/components/ui/search-dropdown"

// Discord icon component since lucide-react doesn't have one
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.010c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
)


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
            
            {/* Navigation - moved to left side, hidden on mobile */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/markets" className="navbar-link">
                Markets
              </Link>
              <Link href="/portfolio" className="navbar-link">
                Portfolio
              </Link>
              
              {/* Search positioned right after Portfolio */}
              <div className="ml-8">
                <SearchDropdown />
              </div>
            </div>
          </div>

          {/* Right side - Settings, Discord, GitHub link, hidden on mobile */}
          <div className="hidden md:flex items-center space-x-2">
            <div data-settings-trigger>
              <SettingsSheet />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-9 w-9 p-0"
            >
              <a
                href="https://discord.gg/ZR4QtSr3VU"
                target="_blank"
                rel="noopener noreferrer"
                title="Join our Discord"
              >
                <DiscordIcon className="h-4 w-4" />
                <span className="sr-only">Discord</span>
              </a>
            </Button>
            
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