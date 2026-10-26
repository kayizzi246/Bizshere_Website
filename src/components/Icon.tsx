/** Simple stroke icons (24×24), so the site needs no icon library. */
const PATHS: Record<string, React.ReactNode> = {
  idea: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" /></>,
  machine: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M7 7V4h10v3" /><circle cx="12" cy="13" r="3" /></>,
  supplier: <><path d="M3 9 12 3l9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-7h6v7" /></>,
  funding: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 10v4M18 10v4" /></>,
  prices: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></>,
  expert: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  guide: <><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z" /><path d="M8 8h6M8 12h6" /></>,
  tool: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 19h0" /></>,
  recipe: <><path d="M4 11h16a8 8 0 0 1-16 0Z" /><path d="M8 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  check: <path d="M5 12l4 4 10-10" />,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  store: <><path d="M4 10v10h16V10" /><path d="M3 10 5 4h14l2 6Z" /><path d="M9 20v-6h6v6" /></>,
};

export function Icon({ name, className = "h-5 w-5", strokeWidth = 2 }: { name: keyof typeof PATHS | string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {PATHS[name]}
    </svg>
  );
}
