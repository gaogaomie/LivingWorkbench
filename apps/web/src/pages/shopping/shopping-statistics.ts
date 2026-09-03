import type { ShoppingItem } from "@daily-life/shared";

export interface ShoppingBudgetCategory {
  categoryId: ShoppingItem["categoryId"];
  amountFen: number;
}

export function summarizeWantedBudget(items: ShoppingItem[]): ShoppingBudgetCategory[] {
  const amounts = new Map<ShoppingItem["categoryId"], number>();
  for (const item of items) {
    if (item.status !== "wanted" || item.estimatedUnitPriceFen === null) continue;
    const amountFen = item.estimatedUnitPriceFen * item.quantity;
    amounts.set(item.categoryId, (amounts.get(item.categoryId) ?? 0) + amountFen);
  }
  return Array.from(amounts, ([categoryId, amountFen]) => ({ categoryId, amountFen })).sort(
    (left, right) => right.amountFen - left.amountFen,
  );
}
