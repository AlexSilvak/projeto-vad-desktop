import * as React from "react";
import * as AD from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const AlertDialog = AD.Root;

const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AD.Content>,
  React.ComponentPropsWithoutRef<typeof AD.Content>
>(({ className, ...props }, ref) => (
  <AD.Portal>
    <AD.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
    <AD.Content
      ref={ref}
      className={cn(
        "fixed z-50 grid w-full gap-4 border border-amber/40 bg-background p-5 shadow-[0_0_40px_rgba(251,191,36,0.2)]",
        // celular: folha presa embaixo; telas maiores: caixa centralizada
        "bottom-0 left-0 rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
        "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:pb-5",
        className,
      )}
      {...props}
    />
  </AD.Portal>
));
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogTitle = React.forwardRef<React.ComponentRef<typeof AD.Title>, React.ComponentPropsWithoutRef<typeof AD.Title>>(
  ({ className, ...props }, ref) => <AD.Title ref={ref} className={cn("font-hud text-base font-semibold text-amber", className)} {...props} />,
);
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<React.ComponentRef<typeof AD.Description>, React.ComponentPropsWithoutRef<typeof AD.Description>>(
  ({ className, ...props }, ref) => <AD.Description ref={ref} className={cn("break-words text-sm text-foreground/90", className)} {...props} />,
);
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogAction = React.forwardRef<React.ComponentRef<typeof AD.Action>, React.ComponentPropsWithoutRef<typeof AD.Action>>(
  ({ className, ...props }, ref) => <AD.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />,
);
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<React.ComponentRef<typeof AD.Cancel>, React.ComponentPropsWithoutRef<typeof AD.Cancel>>(
  ({ className, ...props }, ref) => <AD.Cancel ref={ref} className={cn(buttonVariants({ variant: "destructive" }), className)} {...props} />,
);
AlertDialogCancel.displayName = "AlertDialogCancel";

export { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
