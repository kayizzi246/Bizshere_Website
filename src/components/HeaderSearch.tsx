"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DIRECTORIES } from "@/config/directories";
import { Icon } from "./Icon";

/**
 * Search button for the header. It follows the page you're on: from /machines (or a
 * machine's own page) it opens the machine search with machine filters, and so on.
 * Anywhere else it searches everything.
 */
export function HeaderSearch({ className = "", label = true }: { className?: string; label?: boolean }) {
  const path = usePathname() ?? "/";
  const params = useSearchParams();
  const here = path === "/search" ? DIRECTORIES.find((d) => d.type === params?.get("in")) : DIRECTORIES.find((d) => path === d.href || path.startsWith(d.href + "/"));
  const href = here ? `/search?in=${here.type}` : "/search";
  const text = here ? `Search ${here.nav.toLowerCase()}` : "Search";
  return (
    <Link href={href} aria-label={text} title={text} className={className}>
      <Icon name="search" className="h-[18px] w-[18px] shrink-0" />
      {label ? <span className="hidden max-w-[11rem] truncate 2xl:inline">{text}</span> : null}
    </Link>
  );
}
