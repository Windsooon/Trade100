"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, Settings, Copy, ExternalLink, ChevronRight } from "lucide-react"

interface WalletSetupGuideProps {
  onAddressAdded?: () => void
}

export function WalletSetupGuide({ onAddressAdded }: WalletSetupGuideProps) {
  const [currentStep, setCurrentStep] = React.useState(1)

  const steps = [
    {
      id: 1,
      title: "Go to Polymarket",
      description: "Visit polymarket.com and connect your wallet",
      details: "Make sure you're logged into your Polymarket account with your wallet connected.",
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          asChild
          className="w-full"
        >
          <a 
            href="https://polymarket.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Polymarket
          </a>
        </Button>
      )
    },
    {
      id: 2,
      title: "Copy Your Wallet Address",
      description: "Find and copy your wallet address from Polymarket",
      details: "Click on your profile/wallet section in Polymarket and copy your wallet address (starts with 0x...).",
      action: (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Look for an address like: <code className="bg-muted px-1 rounded text-xs">0x1234...abcd</code>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentStep(3)}
            className="w-full"
          >
            <Copy className="h-4 w-4 mr-2" />
            I've Copied My Address
          </Button>
        </div>
      )
    },
    {
      id: 3,
      title: "Add Address to Settings",
      description: "Enter your wallet address in the settings",
      details: "Click the gear icon (⚙️) in the top-right corner of this page, then paste your wallet address.",
      action: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>Look for this icon in the navbar:</span>
            <Settings className="h-4 w-4" />
          </div>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => {
              // Trigger a check for the wallet address
              if (onAddressAdded) {
                onAddressAdded()
              }
            }}
            className="w-full"
          >
            Check Settings
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertDescription>
          To view your portfolio data, please add your Polymarket wallet address to the settings.
        </AlertDescription>
      </Alert>

      {/* Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Setup Your Portfolio
          </CardTitle>
          <CardDescription>
            Follow these steps to connect your Polymarket wallet and view your portfolio data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            
            return (
              <div 
                key={step.id}
                className={`p-4 border rounded-lg transition-all ${
                  isActive 
                    ? 'border-primary bg-primary/5' 
                    : isCompleted 
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-muted'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Step Number */}
                  <div 
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? '✓' : step.id}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{step.title}</h3>
                      {isActive && (
                        <Badge variant="default" className="text-xs">
                          Current Step
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="secondary" className="text-xs text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50">
                          Completed
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                    
                    {isActive && (
                      <div className="space-y-3 pt-2">
                        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          {step.details}
                        </p>
                        {step.action}
                      </div>
                    )}
                  </div>

                  {/* Navigation Arrow */}
                  {!isCompleted && !isActive && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Additional Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            If you're having trouble finding your wallet address:
          </div>
          <ul className="text-sm space-y-1 text-muted-foreground ml-4">
            <li>• Make sure you're logged into Polymarket with your wallet connected</li>
            <li>• Look for your wallet address in your profile or account settings</li>
            <li>• The address should be 42 characters long and start with "0x"</li>
            <li>• Your private key is optional and only needed for advanced features</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 