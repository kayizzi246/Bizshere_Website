/**
 * What the two services panels share: the phone sheet (ServicesSheet.tsx) and the computer menu (ServicesMenu.tsx),
 * both bottom left (client, 24 Nov 2026).
 */
export type Service = { href: string; icon: string; nav: string; text: string };

// The services in the order someone uses them. Anything not named here goes under "More".
const GROUPS: [string, string[]][] = [
  ["Start a business", ["/business-ideas", "/machines", "/suppliers", "/funding"]],
  ["Get help", ["/experts", "/guides", "/tools", "/forum"]],
  ["Stay informed", ["/prices", "/news", "/tips", "/websites"]],
];

/** The services in their groups, empty groups left out. */
export function serviceGroups(services: Service[]): [string, Service[]][] {
  const named = new Set(GROUPS.flatMap(([, hrefs]) => hrefs));
  const all: [string, Service[]][] = [
    ...GROUPS.map(([title, hrefs]): [string, Service[]] => [title, hrefs.flatMap((h) => services.filter((s) => s.href === h))]),
    ["More", services.filter((s) => !named.has(s.href))],
  ];
  return all.filter(([, list]) => list.length);
}

/** The page is this service, or one of its records. */
export const isHere = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** Forms and account pages keep the screen for their content. */
export function hideQuickLinks(path: string) {
  const [first, second] = path.split("/").filter(Boolean);
  return ["login", "signup", "account", "membership", "supplier", "expert", "payments", "staff"].includes(first)
    || (["suppliers", "experts"].includes(first) && ["login", "join"].includes(second));
}
