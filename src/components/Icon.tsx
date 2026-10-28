import {
  ArrowRight, Bell, BookOpen, Calculator, CalendarDays, Check, ChefHat, Download, Factory, Landmark, Lightbulb, Link2,
  Mail, MapPin, Menu, Newspaper, Phone, PlayCircle, Search, ShieldCheck, Store, TrendingUp, UserRound, Warehouse, type LucideIcon,
  ExternalLink, Files, Flag, Inbox, LayoutDashboard, Megaphone, Plus, Rocket, Users, Wallet, X,
} from "lucide-react";

/** Site icons by name, drawn with Lucide. Pages refer to icons by these names only. */
const ICONS: Record<string, LucideIcon> = {
  idea: Lightbulb,
  machine: Factory,
  supplier: Warehouse,
  funding: Landmark,
  prices: TrendingUp,
  expert: UserRound,
  guide: BookOpen,
  tool: Calculator,
  recipe: ChefHat,
  news: Newspaper,
  search: Search,
  check: Check,
  shield: ShieldCheck,
  calendar: CalendarDays,
  link: Link2,
  bell: Bell,
  arrow: ArrowRight,
  menu: Menu,
  store: Store,
  video: PlayCircle,
  download: Download,
  phone: Phone,
  mail: Mail,
  pin: MapPin,
  dashboard: LayoutDashboard,
  inbox: Inbox,
  flag: Flag,
  plus: Plus,
  files: Files,
  users: Users,
  megaphone: Megaphone,
  external: ExternalLink,
  opportunity: Rocket,
  wallet: Wallet,
  close: X,
};

export function Icon({ name, className = "h-5 w-5", strokeWidth = 2 }: { name: keyof typeof ICONS | string; className?: string; strokeWidth?: number }) {
  const Glyph = ICONS[name] ?? Link2;
  return <Glyph aria-hidden className={className} strokeWidth={strokeWidth} />;
}
