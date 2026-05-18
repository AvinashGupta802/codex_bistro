export function applyActions(cart, actions, menu) {
  const lookup = new Map(menu.map((item) => [item.id, item]));
  const next = new Map(cart.map((line) => [line.itemId, { ...line }]));

  for (const action of actions) {
    if (!action || !action.type) continue;

    if (action.type === "clear_cart") {
      next.clear();
      continue;
    }

    const item = lookup.get(action.itemId);
    if (!item) continue;

    if (action.type === "add_item") {
      const existing = next.get(item.id);
      const quantity = Math.max(1, Number(action.quantity) || 1);
      next.set(item.id, {
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: (existing?.quantity ?? 0) + quantity,
        modifiers: { ...(existing?.modifiers ?? {}), ...(action.modifiers ?? {}) }
      });
    }

    if (action.type === "remove_item") {
      next.delete(item.id);
    }

    if (action.type === "set_quantity") {
      const quantity = Math.max(0, Number(action.quantity) || 0);
      if (quantity === 0) {
        next.delete(item.id);
      } else {
        const existing = next.get(item.id);
        next.set(item.id, {
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity,
          modifiers: { ...(existing?.modifiers ?? {}), ...(action.modifiers ?? {}) }
        });
      }
    }
  }

  return Array.from(next.values());
}

export function cartTotal(cart) {
  return cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

