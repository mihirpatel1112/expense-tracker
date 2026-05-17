import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-base text-white outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black placeholder:text-zinc-500 focus:border-[#30d158] focus:ring-4 focus:ring-[#30d158]/15",
        className,
      )}
      {...props}
    />
  );
}
