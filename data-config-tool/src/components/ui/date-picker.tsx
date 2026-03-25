import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { zhCN } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  clearable?: boolean
}

export function DatePicker({ date, onDateChange, placeholder = "选择日期", className, clearable = false }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    onDateChange?.(undefined)
  }

  return (
    <div className="relative inline-block">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[180px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
              clearable && date && "pr-8",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "yyyy-MM-dd", { locale: zhCN }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
            defaultMonth={date}
            initialFocus
            locale={zhCN}
          />
        </PopoverContent>
      </Popover>
      {clearable && date && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 hover:opacity-100 flex items-center justify-center"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
