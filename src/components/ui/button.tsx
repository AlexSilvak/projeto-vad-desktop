import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-hud font-semibold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-cyan-400 to-sky-500 text-primary-foreground shadow-[0_0_18px_hsl(187_100%_50%/0.35)] hover:brightness-110",
        outline: "border border-primary/40 bg-primary/10 text-foreground hover:bg-primary/20",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
      },
      size: { default: "h-11 px-4", sm: "h-9 px-3 text-xs", icon: "h-11 w-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
export { Button, buttonVariants };
