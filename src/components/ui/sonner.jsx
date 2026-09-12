"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--width": "24rem",
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)"
        }
      }
      toastOptions={{
        classNames: {
          toast:
            "!gap-3 !rounded-xl !border-primary !bg-popover !px-4 !py-4 !pr-10 !text-popover-foreground !shadow-lg",
          title: "!text-base !font-semibold",
          description: "!text-sm !text-muted-foreground",
          icon:
            "!size-9 !justify-center !rounded-full !text-white [&>svg]:!size-4",
          closeButton:
            "!left-auto !right-3 !top-1/2 !translate-x-0 !-translate-y-1/2 !border-0 !bg-transparent !text-foreground",
          default: "[&_[data-icon]]:!bg-slate-400",
          success: "[&_[data-icon]]:!bg-teal-600",
          info: "[&_[data-icon]]:!bg-blue-600",
          warning: "[&_[data-icon]]:!bg-signal",
          error: "[&_[data-icon]]:!bg-destructive",
          loading: "[&_[data-icon]]:!bg-primary",
        },
      }}
      {...props} />
  );
}

export { Toaster }
