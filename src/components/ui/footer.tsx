import Link from 'next/link'
import { Github, Twitter, Linkedin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-background border-t border-border/40 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Trade100</h3>
            <p className="text-sm text-muted-foreground">
              Leveraging the wisdom of crowds to provide actionable insights for prediction markets.
            </p>
            <div className="flex items-center gap-4">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground uppercase">Products</h4>
            <div className="space-y-2">
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Portfolio Strategies
              </Link>
              <Link href="/markets" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Markets Dashboard
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Expert Analysis
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                API Access
              </Link>
            </div>
          </div>

          {/* Resources Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground uppercase">Resources</h4>
            <div className="space-y-2">
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Guides
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
            </div>
          </div>

          {/* Company Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground uppercase">Company</h4>
            <div className="space-y-2">
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Careers
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact Us
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border/40 mt-12 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Trade100. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>📧</span>
              <Link href="mailto:contact@wisdom100.net" className="hover:text-foreground transition-colors">
                contact@wisdom100.net
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 