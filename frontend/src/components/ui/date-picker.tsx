"use client";
import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  disabled,
  className,
  clearable = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const validDate = date && isValid(date) ? date : undefined;

  const currentYear = new Date().getFullYear();

  function handleSelect(selected: Date | undefined) {
    if (selected) {
      onChange(format(selected, "yyyy-MM-dd"));
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !validDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1">
            {validDate ? format(validDate, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
          </span>
          {clearable && validDate && (
            <X
              className="h-3.5 w-3.5 ml-1 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={validDate}
          onSelect={handleSelect}
          defaultMonth={validDate ?? new Date()}
          captionLayout="dropdown"
          startMonth={new Date(currentYear - 10, 0)}
          endMonth={new Date(currentYear + 5, 11)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
