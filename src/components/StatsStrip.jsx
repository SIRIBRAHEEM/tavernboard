import { MessagesSquare, Heart, Users, Clock3 } from "lucide-react";
import { formatTime } from "@/lib/messages.js";

export default function StatsStrip({ stats }) {
  const items = [
    { icon: MessagesSquare, label: "Notes on the board", value: stats.totalMessages },
    { icon: Heart, label: "Cheers given", value: stats.totalLikes },
    { icon: Users, label: "Voices heard", value: stats.uniqueAuthors },
    {
      icon: Clock3,
      label: "Latest activity",
      value: stats.latestActivity ? formatTime(stats.latestActivity) : "Nothing yet",
    },
  ];
  return (
    <section aria-label="Board statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="rounded-2xl border border-night-700/70 bg-night-850/90 px-4 py-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-parchment-300">
            <Icon className="h-4 w-4 text-amber-glow" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">{label}</span>
          </div>
          <p className="mt-2 font-display text-2xl leading-none text-parchment-50">{value}</p>
        </div>
      ))}
    </section>
  );
}
