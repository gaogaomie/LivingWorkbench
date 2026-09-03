import type {
  CreateShoppingItem,
  ShoppingItem,
  ShoppingResponse,
  UpdateShoppingItem,
} from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const shoppingService = {
  get: (month: string) => requestData<ShoppingResponse>({ url: "/shopping", params: { month } }),
  create: (input: CreateShoppingItem, csrfToken: string) =>
    requestData<{ id: string }>({
      url: "/shopping/items",
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  update: (input: UpdateShoppingItem & { id: string }, csrfToken: string) =>
    requestData<{ updated: true }>({
      url: `/shopping/items/${input.id}`,
      method: "PUT",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  setStatus: (
    input: { item: ShoppingItem; status: "wanted" | "purchased"; purchasedOn: string | null },
    csrfToken: string,
  ) =>
    requestData<{ updated: true }>({
      url: `/shopping/items/${input.item.id}/status`,
      method: "PATCH",
      headers: csrfHeaders(csrfToken),
      data: {
        status: input.status,
        actualUnitPriceFen: input.item.actualUnitPriceFen,
        purchasedOn: input.purchasedOn,
      },
    }),
};
