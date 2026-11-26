import { Flame, Pin, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/input.jsx";
import { CONFIG, realmWebUrl } from "@/config.js";

export default function Header({ dataSource }) {
  return (
    <header className="border-b border-night-700/60 bg-night-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-glow/40 bg-night-850 shadow-glow">
            <Flame className="h-6 w-6 text-amber-glow" aria-hidden="true" />
            <Pin className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-amber-glow p-0.5 text-night-950" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-2xl leading-none text-parchment-50">TavernBoard</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-parchment-300">
              The Gnome Tavern community board
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {dataSource === "chain" ? (
            <Badge tone="green">Live from realm</Badge>
          ) : (
            <Badge tone="amber">Demo data</Badge>
          )}
          <Badge tone="neutral">{CONFIG.CHAIN_ID} testnet</Badge>
          <a
            href={realmWebUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-night-600 bg-night-800 px-3 py-1.5 text-xs font-semibold text-parchment-100 transition-colors hover:border-amber-glow/50 hover:text-amber-soft"
          >
            View realm on gnoweb
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}
