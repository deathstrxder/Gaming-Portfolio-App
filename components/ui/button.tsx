import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display text-sm font-medium uppercase tracking-[0.2em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-35",
  {
    variants: {
      variant: {
        neon: "border border-neon-blue/60 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:box-glow-blue",
        purple:
          "border border-neon-purple/60 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 hover:box-glow-purple",
        ghost: "text-muted hover:text-ink",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "neon",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
