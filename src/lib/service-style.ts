import type { ContentType } from "@prisma/client";

/**
 * Each kind of content in plain words, with its service colour (the same colours as the homepage,
 * src/components/HomeFeatures.tsx), for the admin: the Add content page, the content list and the forms.
 * `colour` for icons and chips, `soft` for the tile behind an icon.
 */
export type ServiceStyle = { name: string; what: string; colour: string; soft: string };

export const SERVICE_STYLE: Record<ContentType, ServiceStyle> = {
  BUSINESS_IDEA: { name: "Business idea", what: "A business plan with its costs", colour: "#0F5B3E", soft: "#E3F4EA" },
  MACHINE: { name: "Business machine", what: "A machine, what it does and costs", colour: "#071A33", soft: "#E4E8EF" },
  SUPPLIER: { name: "Trusted supplier", what: "A business that sells stock or materials", colour: "#1268A6", soft: "#E3F0FA" },
  FUNDING_PROGRAMME: { name: "Funding source", what: "A loan, grant or investor", colour: "#B35F0C", soft: "#FDF0E2" },
  INVESTMENT_OPPORTUNITY: { name: "Investment opportunity", what: "A business looking for investors", colour: "#B35F0C", soft: "#FDF0E2" },
  GUIDE: { name: "Business guide", what: "Step-by-step help, e.g. registering", colour: "#4338CA", soft: "#E8E7FA" },
  CONSULTANT: { name: "Business expert", what: "An advisor people can contact", colour: "#4A1D6B", soft: "#EFE6F5" },
  TOOL: { name: "Business tool", what: "A calculator or template", colour: "#0F766E", soft: "#DDF1EF" },
  WEBSITE: { name: "Useful website", what: "A link to a helpful website", colour: "#475467", soft: "#EEF0F3" },
  NEWS: { name: "Business news", what: "A news story or update", colour: "#8B5E1A", soft: "#F6EDE0" },
  BUSINESS_TIP: { name: "Business tip", what: "A short, practical tip", colour: "#BE185D", soft: "#FCE7F1" },
  RECIPE: { name: "Recipe", what: "A recipe", colour: "#475467", soft: "#EEF0F3" },
};

/** A page's status in plain words, with its badge. */
export const STATUS_WORDS: Record<string, [string, string]> = {
  PUBLISHED: ["Live", "badge-ok"],
  DRAFT: ["Draft", "badge-muted"],
  IN_REVIEW: ["Waiting for a check", "badge-info"],
  ARCHIVED: ["Hidden", "badge-bad"],
};
