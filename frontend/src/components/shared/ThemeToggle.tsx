"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema"
      className={cn(
        "relative flex items-center w-16 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isDark
          ? "bg-slate-700 border border-slate-600"
          : "bg-amber-100 border border-amber-200",
        className
      )}
    >
      {/* bolinha deslizante */}
      <span
        className={cn(
          "absolute flex items-center justify-center w-6 h-6 rounded-full shadow-sm transition-all duration-300",
          isDark
            ? "translate-x-8 bg-slate-900"
            : "translate-x-0 bg-white"
        )}
      >
        {isDark
          ? <Moon className="h-3.5 w-3.5 text-blue-300" />
          : <Sun className="h-3.5 w-3.5 text-amber-500" />}
      </span>

      {/* ícones fixos de fundo */}
      <Sun className="h-3 w-3 text-amber-400 ml-0.5 shrink-0" />
      <Moon className="h-3 w-3 text-slate-400 ml-auto mr-0.5 shrink-0" />
    </button>
  );
}
