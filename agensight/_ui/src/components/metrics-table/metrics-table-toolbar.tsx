import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface MetricsTableToolbarProps {
  columnFilters: any[]
  setColumnFilters: (value: any[]) => void
}

export function MetricsTableToolbar({
  columnFilters,
  setColumnFilters,
}: MetricsTableToolbarProps) {
  const isFiltered = columnFilters.length > 0

  return (
    <div className="flex items-center gap-2 py-4">
      <div className="relative flex-1">
        <MagnifyingGlassIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter metrics..."
          value={(columnFilters.find((filter) => filter.id === "metricName")?.value as string) ?? ""}
          onChange={(event) =>
            setColumnFilters([
              {
                id: "metricName",
                value: event.target.value,
              },
            ])
          }
          className="w-full pl-8 text-sm"
        />
      </div>
      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => setColumnFilters([])}
          className="h-8 px-2 lg:px-3"
        >
          Reset
          <Cross2Icon className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  )
} 