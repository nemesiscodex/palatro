import { useEffect } from "react";

import { useAppSound } from "@/hooks/use-app-sound";
import { cardPlace3Sound } from "@/lib/card-place-3";
import { select008Sound } from "@/lib/select-008";
import { switch006Sound } from "@/lib/switch-006";
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
  const playCardPickSound = useAppSound(switch006Sound, { volumeMultiplier: 0.65 });
  const playDealCardsSound = useAppSound(cardPlace3Sound, { volumeMultiplier: 0.2 });
  const playHoverSound = useAppSound(select008Sound, { volumeMultiplier: 0.12 });

  useEffect(() => {
    if (deck.length === 0) {
      return;
    }

    // Match the staggered CSS deal animation and fire shortly before it fully settles.
    const lastCardEndMs = 80 + (deck.length - 1) * 55 + 50;
    const nearEndDelayMs = Math.max(0, lastCardEndMs - 120);

    const timeoutId = window.setTimeout(() => {
      playDealCardsSound();
    }, nearEndDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [deck.length, playDealCardsSound]);

  return (
    <div
      data-testid="point-card-grid"
      className="grid grid-cols-3 gap-2.5 min-[420px]:grid-cols-4 sm:gap-4"
    >
      {deck.map((value, index) => {
        const isSelected = selectedValue === value;
        const suit = getSuit(index);
        const suitColor = getSuitColor(index);

        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onMouseEnter={() => {
              if (!disabled) {
                playHoverSound();
              }
            }}
            onClick={() => {
              playCardPickSound();
              void onSelect(value);
            }}
            className={cn(
              "group/poker-card relative flex flex-col items-center justify-center",
              "h-[6.25rem] rounded-xl transition-[transform,box-shadow,filter,opacity] duration-300 ease-out min-[420px]:h-[7rem] sm:h-[7.5rem]",
              "cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
              "hover:scale-[1.04] hover:brightness-[1.02] active:scale-[0.98]",
              isSelected
                ? "card-face -translate-y-2 ring-2 ring-amber-500/65 brightness-[0.94] shadow-[0_14px_42px_rgba(218,185,100,0.33),0_6px_14px_rgba(0,0,0,0.24)]"
                : "card-face hover:shadow-[0_14px_36px_rgba(0,0,0,0.4)]",
            )}
            style={{
              animation: `deal-card 0.5s cubic-bezier(0.16, 0.84, 0.24, 1) ${80 + index * 55}ms both`,
            }}
          >
            {/* Corner value - top left */}
            <span className={cn(
              "absolute left-2 top-2 flex flex-col items-center leading-none min-[420px]:left-2.5",
              isSelected ? "text-amber-800" : "text-neutral-500",
            )}>
              <span className="text-[0.52rem] font-bold font-sans min-[420px]:text-[0.6rem]">{value}</span>
              <span className={cn("text-[0.48rem] min-[420px]:text-[0.55rem]", suitColor)}>{suit}</span>
            </span>

            {/* Center value */}
            <span className={cn(
              "font-serif text-[1.7rem] font-bold transition-colors min-[420px]:text-[2rem] sm:text-3xl",
              isSelected ? "text-amber-900" : "text-neutral-700",
            )}>
              {value}
            </span>

            {/* Center suit */}
            <span className={cn(
              "mt-0.5 text-[0.8rem] transition-opacity min-[420px]:text-sm",
              suitColor,
              isSelected ? "opacity-95" : "opacity-40",
            )}>
              {suit}
            </span>

            {/* Corner value - bottom right */}
            <span className={cn(
              "absolute bottom-2 right-2 flex flex-col items-center leading-none rotate-180 min-[420px]:right-2.5",
              isSelected ? "text-amber-800" : "text-neutral-500",
            )}>
              <span className="text-[0.52rem] font-bold font-sans min-[420px]:text-[0.6rem]">{value}</span>
              <span className={cn("text-[0.48rem] min-[420px]:text-[0.55rem]", suitColor)}>{suit}</span>
            </span>

            {/* Selection glow */}
            {isSelected && (
              <div className="absolute inset-0 rounded-xl bg-black/8 pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
}
