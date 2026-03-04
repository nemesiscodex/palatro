import { cn } from "@/lib/utils";

interface PointCardGridProps {
  deck: string[];
  selectedValue: string | null;
  disabled?: boolean;
  onSelect: (value: string) => Promise<void>;
}

const SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"];

function getSuit(index: number) {
  return SUITS[index % SUITS.length];
}

function getSuitColor(index: number) {
  const suit = SUITS[index % SUITS.length];
  return suit === "\u2665" || suit === "\u2666" ? "text-red-700" : "text-neutral-800";
}

export default function PointCardGrid({
  deck,
  selectedValue,
  disabled = false,
  onSelect,
}: PointCardGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-4">
      {deck.map((value, index) => {
        const isSelected = selectedValue === value;
        const suit = getSuit(index);
        const suitColor = getSuitColor(index);

        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => {
              void onSelect(value);
            }}
            className={cn(
              "group/poker-card relative flex flex-col items-center justify-center",
              "h-[7.5rem] rounded-xl transition-all duration-300 ease-out",
              "disabled:pointer-events-none disabled:opacity-40",
              "hover:-translate-y-2 hover:scale-[1.04] active:scale-[0.98]",
              isSelected
                ? "card-face -translate-y-2 ring-2 ring-amber-500/60 shadow-[0_12px_40px_rgba(218,185,100,0.35),0_4px_12px_rgba(0,0,0,0.2)]"
                : "card-face hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]",
            )}
            style={{
              animation: `deal-card 0.5s cubic-bezier(0.16, 0.84, 0.24, 1) ${80 + index * 55}ms both`,
            }}
          >
            {/* Corner value - top left */}
            <span className={cn(
              "absolute top-2 left-2.5 flex flex-col items-center leading-none",
              isSelected ? "text-amber-700" : "text-neutral-500",
            )}>
              <span className="text-[0.6rem] font-bold font-sans">{value}</span>
              <span className={cn("text-[0.55rem]", suitColor)}>{suit}</span>
            </span>

            {/* Center value */}
            <span className={cn(
              "font-serif text-3xl font-bold transition-colors",
              isSelected ? "text-amber-800" : "text-neutral-700",
            )}>
              {value}
            </span>

            {/* Center suit */}
            <span className={cn(
              "text-sm mt-0.5 transition-opacity",
              suitColor,
              isSelected ? "opacity-80" : "opacity-40",
            )}>
              {suit}
            </span>

            {/* Corner value - bottom right */}
            <span className={cn(
              "absolute bottom-2 right-2.5 flex flex-col items-center leading-none rotate-180",
              isSelected ? "text-amber-700" : "text-neutral-500",
            )}>
              <span className="text-[0.6rem] font-bold font-sans">{value}</span>
              <span className={cn("text-[0.55rem]", suitColor)}>{suit}</span>
            </span>

            {/* Selection glow */}
            {isSelected && (
              <div className="absolute inset-0 rounded-xl bg-amber-400/8 pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
}
