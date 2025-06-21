"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Event, Market, getMarketDisplayTitle } from "@/lib/stores"

// Helper functions
const formatVolume = (volume: number | undefined): string => {
  if (!volume || volume === 0) {
    return '0'
  }
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`
  }
  return volume.toFixed(2)
}

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return 'Invalid Date'
  }
}

const formatLiquidity = (liquidity: number | undefined): string => {
  if (!liquidity || liquidity === 0) {
    return '0'
  }
  if (liquidity >= 1000000) {
    return `${(liquidity / 1000000).toFixed(2)}M`
  } else if (liquidity >= 1000) {
    return `${(liquidity / 1000).toFixed(2)}K`
  }
  return liquidity.toFixed(2)
}



// Markets nested table component
interface MarketsTableProps {
  markets: Market[]
}

function MarketsTable({ markets }: MarketsTableProps) {
  if (!markets || markets.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No markets available for this event
      </div>
    )
  }

  // Sort markets by 1-hour price change in descending order (highest changes first)
  const sortedMarkets = [...markets].sort((a, b) => {
    const aChange = a.oneHourPriceChange || 0
    const bChange = b.oneHourPriceChange || 0
    return bChange - aChange
  })

  return (
    <div className="bg-muted/30 p-4 rounded-md">
      <h4 className="font-medium mb-3 text-sm">Markets ({markets.length})</h4>
      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Question</TableHead>
              <TableHead className="text-xs">Yes Price</TableHead>
              <TableHead className="text-xs">No Price</TableHead>
              <TableHead className="text-xs">1h Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMarkets.map((market, index) => {
              const yesPrice = market.outcomePrices?.[0]
              const noPrice = market.outcomePrices?.[1]
              const priceChange = market.oneHourPriceChange
              
              const formatPriceChange = (change: number | undefined): string => {
                if (change === undefined || change === null) return 'None'
                const percentage = (change * 100).toFixed(2)
                return change >= 0 ? `+${percentage}%` : `${percentage}%`
              }

              return (
                <TableRow key={market.conditionId || index} className="text-xs">
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={getMarketDisplayTitle(market)}>
                      {getMarketDisplayTitle(market)}
                    </div>
                  </TableCell>
                  <TableCell>{yesPrice || 'None'}</TableCell>
                  <TableCell>{noPrice || 'None'}</TableCell>
                  <TableCell className={priceChange && priceChange >= 0 ? 'text-green-600' : priceChange && priceChange < 0 ? 'text-red-600' : ''}>
                    {formatPriceChange(priceChange)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

interface EventsDataTableProps {
  data: Event[]
}

export function EventsDataTable({ data }: EventsDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [expandedEventId, setExpandedEventId] = React.useState<string | null>(null)

  const handleRowClick = (eventId: string) => {
    // Close the previously open event and open the new one, or close if clicking the same event
    setExpandedEventId(prev => prev === eventId ? null : eventId)
  }

  const columns: ColumnDef<Event>[] = [
    {
      id: "expandIcon",
      header: "",
      cell: ({ row }) => {
        const isExpanded = expandedEventId === row.original.id
        return (
          <div className="flex items-center justify-center w-8">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: "Event Title",
      cell: ({ row }) => {
        const event = row.original
        const polymarketUrl = `https://polymarket.com/event/${event.slug}`
        
        return (
          <div className="max-w-md truncate font-medium flex items-center gap-2" title={row.getValue("title")}>
            <span>{row.getValue("title")}</span>
            {event.slug && (
              <ExternalLink 
                className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0" 
                onClick={(e) => {
                  e.stopPropagation() // Prevent row expansion
                  window.open(polymarketUrl, '_blank')
                }}
              />
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "liquidity",
      header: "Liquidity",
      cell: ({ row }) => {
        const liquidity = row.getValue("liquidity") as number | undefined
        return <div>{formatLiquidity(liquidity)}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: "volume24hr",
      header: "Volume (24h)",
      cell: ({ row }) => {
        const volume = row.getValue("volume24hr") as number | undefined
        return <div>${formatVolume(volume)}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: "volume1wk",
      header: "Volume (1w)",
      cell: ({ row }) => {
        const volume = row.getValue("volume1wk") as number | undefined
        return <div>${formatVolume(volume)}</div>
      },
      enableSorting: false,
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => {
        const date = row.getValue("endDate") as string
        return <div>{formatDate(date)}</div>
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const event = row.original
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation() // Prevent row expansion when clicking the button
              window.open(`/events/${event.id}`, '_blank')
            }}
            className="h-8 px-3 cursor-pointer"
          >
            Details
          </Button>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableSorting: false,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-4">
        <Input
          placeholder="Search events by title..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">
            Showing {table.getFilteredRowModel().rows.length} events
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isExpanded = expandedEventId === row.original.id
                return (
                  <React.Fragment key={row.id}>
                    {/* Main event row - clickable */}
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {/* Expanded markets row */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="p-0">
                          <MarketsTable markets={row.original.markets} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()} ({table.getFilteredRowModel().rows.length} total events)
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
} 