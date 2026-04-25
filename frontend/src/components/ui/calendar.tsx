"use client";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // layout
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-2",
        month_caption: "flex justify-between items-center px-1 pt-1",
        caption_label: "text-sm font-medium",
        // navigation
        nav: "flex items-center gap-1",
        button_previous: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"),
        button_next:     cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"),
        // dropdown
        dropdowns: "flex gap-1 items-center flex-1 justify-center",
        dropdown: "text-sm font-medium bg-background border rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring",
        dropdown_month: "",
        dropdown_year: "",
        // grid
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] text-center",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 h-8 w-8",
        day_button: cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 p-0 font-normal aria-selected:opacity-100"),
        // states
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today: "bg-accent text-accent-foreground rounded-md",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        range_start: "rounded-l-md",
        range_end:   "rounded-r-md",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none",
        ...classNames,
      }}
      components={{
        PreviousMonthButton: (props) => <button {...props}><ChevronLeft className="h-4 w-4" /></button>,
        NextMonthButton:     (props) => <button {...props}><ChevronRight className="h-4 w-4" /></button>,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
