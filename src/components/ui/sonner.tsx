import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast cyber-toast group-[.toaster]:backdrop-blur-xl group-[.toaster]:border-[hsl(185_100%_50%/0.3)] group-[.toaster]:shadow-[0_8px_32px_hsl(228_20%_3%/0.4),0_0_20px_hsl(185_100%_50%/0.15)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:border-success/30",
          error: "group-[.toast]:border-destructive/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
