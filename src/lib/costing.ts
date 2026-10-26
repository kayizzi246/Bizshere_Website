import type { Prisma } from "@prisma/client";

type Num = Prisma.Decimal | number | null | undefined;
const n = (v: Num) => (v === null || v === undefined ? null : Number(v));

type Line = { quantityUsed: Num; unitPrice: Num; conversionFactor: Num };
type Costing = {
  ingredientCost: Num; packagingCost: Num; energyCost: Num; labourCost: Num;
  wastagePercent: Num; portionsPerBatch: number | null; sellingPrice: Num;
  lines: Line[];
};

/**
 * Recipe batch costing (blueprint 10). Returns null for any figure that can't be
 * calculated from recorded values: unknown stays unknown, never zero.
 *
 *  line cost       = quantityUsed × unitPrice ÷ conversionFactor (factor defaults to 1)
 *  ingredients     = sum of line costs, or the recorded ingredientCost if there are no lines
 *  batch cost      = ingredients + packaging + energy + labour
 *  usable portions = portionsPerBatch × (1 − wastage%)
 *  cost per portion = batch cost ÷ usable portions
 *  margin          = (sellingPrice − cost per portion) ÷ sellingPrice
 */
export function calculateRecipeCosting(c: Costing) {
  let ingredients: number | null;
  if (c.lines.length) {
    ingredients = c.lines.every((l) => n(l.unitPrice) !== null)
      ? c.lines.reduce((s, l) => s + (n(l.quantityUsed) ?? 0) * (n(l.unitPrice) ?? 0) / (n(l.conversionFactor) ?? 1), 0)
      : null;
  } else {
    ingredients = n(c.ingredientCost);
  }
  const parts = [ingredients, n(c.packagingCost), n(c.energyCost), n(c.labourCost)];
  const batch = parts.every((p) => p !== null) ? parts.reduce((s, p) => s! + p!, 0)! : null;
  const usable = c.portionsPerBatch ? c.portionsPerBatch * (1 - (n(c.wastagePercent) ?? 0) / 100) : null;
  const perPortion = batch !== null && usable ? batch / usable : null;
  const price = n(c.sellingPrice);
  const margin = perPortion !== null && price ? (price - perPortion) / price : null;
  return { ingredients, batch, usablePortions: usable, perPortion, margin };
}

/** Budget scenario total: null until every line has a sourced cost. */
export function budgetTotal(lines: { unitCost: Num; quantity: Num }[]) {
  if (!lines.length || lines.some((l) => n(l.unitCost) === null)) return null;
  return lines.reduce((s, l) => s + (n(l.unitCost) ?? 0) * (n(l.quantity) ?? 0), 0);
}
