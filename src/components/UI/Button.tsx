'use client';

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow hover:bg-blue-700",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700",
        outline:
          "border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50",
        secondary:
          "bg-gray-100 text-gray-700 shadow-sm hover:bg-gray-200",
        ghost: "hover:bg-gray-100 text-gray-700",
        link: "text-blue-600 underline-offset-4 hover:underline",
        success: "bg-green-600 text-white shadow hover:bg-green-700",
        warning: "bg-yellow-500 text-white shadow hover:bg-yellow-600",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
  return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={props.disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
      </Comp>
    )
} 
)
Button.displayName = "Button"

export default Button 