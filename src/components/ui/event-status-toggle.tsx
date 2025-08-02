import { Button } from '@/components/ui/button'

interface EventStatusToggleProps {
  status: 'active' | 'resolved'
  onStatusChange: (status: 'active' | 'resolved') => void
  disabled?: boolean
}

export function EventStatusToggle({ 
  status, 
  onStatusChange, 
  disabled = false 
}: EventStatusToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <Button
        variant={status === 'active' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onStatusChange('active')}
        disabled={disabled}
        className="h-7 px-3 text-xs font-medium"
      >
        Active
      </Button>
      <Button
        variant={status === 'resolved' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onStatusChange('resolved')}
        disabled={disabled}
        className="h-7 px-3 text-xs font-medium"
      >
        Resolved
      </Button>
    </div>
  )
}