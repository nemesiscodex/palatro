import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PointCardGridProps {
  deck: string[];
  selectedValue: string | null;
  disabled?: boolean;
  onSelect: (value: string) => Promise<void>;
}

export default function PointCardGrid({
  deck,
  selectedValue,
  disabled = false,
  onSelect,
}: PointCardGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {deck.map((value) => (
        <Button
          key={value}
          type="button"
          variant={selectedValue === value ? "secondary" : "outline"}
          disabled={disabled}
          onClick={() => {
            void onSelect(value);
          }}
          className={cn(
            "h-16 text-lg",
            selectedValue === value && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {value}
        </Button>
      ))}
    </div>
  );
}
