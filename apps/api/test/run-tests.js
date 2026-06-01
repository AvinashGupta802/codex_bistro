import assert from "node:assert/strict";
import { parseOrderIntent } from "../src/intentParser.js";
import { applyActions, cartTotal } from "../src/cart.js";
import { menu } from "../src/menu.js";
import { classifyMood } from "../src/moodEngine.js";
import { matchCraving } from "../src/cravingMatcher.js";

const first = parseOrderIntent("Add two spicy chicken sandwiches and a large water");
assert.equal(first.actions.length, 2);
assert.deepEqual(first.actions[0], { type: "add_item", itemId: "spicy-chicken", quantity: 2, modifiers: {} });
assert.deepEqual(first.actions[1], { type: "add_item", itemId: "still-water", quantity: 1, modifiers: { size: "large" } });

let cart = applyActions([], first.actions, menu);
assert.equal(cart.length, 2);
assert.equal(cart.find((line) => line.itemId === "spicy-chicken").quantity, 2);

const remove = parseOrderIntent("remove the water from my cart");
cart = applyActions(cart, remove.actions, menu);
assert.equal(cart.some((line) => line.itemId === "still-water"), false);

const update = parseOrderIntent("change spicy chicken to three");
cart = applyActions(cart, update.actions, menu);
assert.equal(cart.find((line) => line.itemId === "spicy-chicken").quantity, 3);
assert.equal(cartTotal(cart), 37.5);

const clear = parseOrderIntent("clear my cart");
cart = applyActions(cart, clear.actions, menu);
assert.equal(cart.length, 0);

const mood = await classifyMood("I am stressed and anxious after a deadline");
assert.equal(mood.mood, "stressed");
assert.equal(mood.recommendations[0].itemId, "fried-chicken");
assert.equal(mood.actions.length, 3);

const craving = matchCraving("I need something crunchy outside and juicy inside along drink tangy in taste");
assert.equal(craving.recommendations[0].itemId, "fried-chicken");
assert.ok(craving.recommendations.some((item) => item.itemId === "ginger-ale"));
assert.deepEqual(craving.actions.map((action) => action.itemId), ["fried-chicken", "ginger-ale"]);

console.log("API parser tests passed");
