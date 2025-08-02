import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationControlsProps {
  currentPage: number
  hasMorePages: boolean
  loading: boolean
  onPageChange: (page: number) => void
  maxVisiblePages?: number
}

export function PaginationControls({ 
  currentPage, 
  hasMorePages, 
  loading, 
  onPageChange,
  maxVisiblePages = 5 
}: PaginationControlsProps) {
  
  // Calculate total pages we know about (we don't know the actual total)
  const knownPages = hasMorePages ? currentPage + 1 : currentPage
  
  // Calculate which pages to show
  const getVisiblePages = () => {
    const pages: number[] = []
    const halfVisible = Math.floor(maxVisiblePages / 2)
    
    let startPage = Math.max(1, currentPage - halfVisible)
    let endPage = Math.min(knownPages, currentPage + halfVisible)
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(knownPages, startPage + maxVisiblePages - 1)
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }
  
  const visiblePages = getVisiblePages()
  const showFirstLast = knownPages > maxVisiblePages
  
  const handlePageChange = (page: number) => {
    if (loading || page === currentPage || page < 1) return
    onPageChange(page)
  }
  
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {/* First page button */}
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={loading || currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}
      
      {/* Previous page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={loading || currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page numbers */}
      {visiblePages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(page)}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          {page}
        </Button>
      ))}
      
      {/* Show ellipsis if there might be more pages */}
      {hasMorePages && visiblePages[visiblePages.length - 1] === currentPage && (
        <span className="px-2 text-muted-foreground">...</span>
      )}
      
      {/* Next page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={loading || !hasMorePages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      {/* Last page button (only show if we know there are more pages) */}
      {showFirstLast && hasMorePages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(knownPages)}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}