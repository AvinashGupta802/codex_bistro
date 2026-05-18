import { CartAction, CartLine, MenuItem } from "./types";

export function applyCartAction(cart: CartLine[], action: CartAction, menu: MenuItem[]): CartLine[] {
  if (action.type === "clear_cart") return [];

  const item = menu.find((entry) => entry.id === action.itemId);
  if (!item) return cart;

  if (action.type === "remove_item") {
    return cart.filter((line) => line.itemId !== item.id);
  }

  const existing = cart.find((line) => line.itemId === item.id);
  const rest = cart.filter((line) => line.itemId !== item.id);

  if (action.type === "set_quantity") {
    if (action.quantity <= 0) return rest;
    return [
      ...rest,
      {
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: action.quantity,
        modifiers: { ...(existing?.modifiers ?? {}), ...(action.modifiers ?? {}) }
      }
    ];
  }

  const quantity = Math.max(1, action.quantity || 1);
  return [
    ...rest,
    {
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity: (existing?.quantity ?? 0) + quantity,
      modifiers: { ...(existing?.modifiers ?? {}), ...(action.modifiers ?? {}) }
    }
  ];
}

export function applyCartActions(cart: CartLine[], actions: CartAction[], menu: MenuItem[]) {
  return actions.reduce((next, action) => applyCartAction(next, action, menu), cart);
}

export function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

