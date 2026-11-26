import { Heart, Clock3, Hourglass, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/input.jsx";
import { formatTime, shortAddress } from "@/lib/messages.js";
import { cn } from "@/lib/utils.js";

export default function MessageCard({ message, liked, onToggleLike }) {
  const displayName = message.name || "Tavern guest";
  return (
    <article className="rounded-2xl border border-night-700/70 bg-night-850/90 p-5 shadow-card transition-colors hover:border-night-600">
      <div className="flex flex-wrap items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-glow/30 bg-night-800 font-display text-base text-amber-soft"
        >
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold text-parchment-50">{displayName}</p>
            <span className="font-mono text-xs text-parchment-300" title={message.author}>
              {shortAddress(message.author)}
            </span>
            {message.pending ? (
              <Badge tone="amber">
                <Hourglass className="h-3 w-3" aria-hidden="true" />
                Pending on chain
              </Badge>
            ) : message.source === "chain" ? (
              <Badge tone="green">
                <Link2 className="h-3 w-3" aria-hidden="true" />
                On chain
              </Badge>
            ) : (
              <Badge tone="neutral">Demo note</Badge>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-parchment-100">
            {message.text}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleLike(message.id)}
              aria-pressed={liked}
              aria-label={liked ? "Remove your cheer" : "Cheer this note"}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow",
                liked
                  ? "border-amber-glow bg-amber-glow text-night-950 shadow-glow"
                  : "border-night-600 bg-night-900 text-parchment-200 hover:border-amber-glow/60 hover:text-amber-soft",
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} aria-hidden="true" />
              {message.likes} {message.likes === 1 ? "cheer" : "cheers"}
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs text-parchment-300">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
