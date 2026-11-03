import test from 'node:test';
import assert from 'node:assert/strict';
import { menu, ingredients, initialStock, canCook, consumeRecipe, migrateStock } from '../economy.js';

const expected = {
  'Classic Fish & Chips': ['fish', 'chips'],
  'Lemon Fish & Chips': ['fish', 'chips', 'lemon'],
  'Saucy Fish & Chips': ['fish', 'chips', 'sauce'],
  'Pea Combo Meal': ['fish', 'chips', 'peas'],
  'Light Fish Plate': ['fish', 'peas', 'lemon'],
  'Street Chips': ['chips', 'sauce', 'lemon'],
  'Green Fish Basket': ['fish', 'peas', 'sauce'],
  'Lemon Fish Portion': ['fish', 'lemon', 'sauce'],
  'Crispy Chips Basket': ['chips', 'peas', 'sauce'],
  'Saucy Chips': ['chips', 'sauce'],
};
test('menu matches all ten requested recipes and only five ingredients', () => {
  assert.deepEqual(ingredients.map(i => i.key), ['fish', 'chips', 'peas', 'lemon', 'sauce']);
  assert.equal(menu.length, 10);
  for (const recipe of menu) assert.deepEqual(recipe.needs, Object.fromEntries(expected[recipe.name].map(key => [key, 1])));
});
test('each meal consumes only its own ingredients exactly once', () => {
  for (const recipe of menu) {
    const stock = initialStock(), before = { ...stock };
    assert.equal(consumeRecipe(stock, recipe), true);
    for (const key of Object.keys(stock)) assert.equal(stock[key], before[key] - (recipe.needs[key] ?? 0));
  }
});
test('a missing ingredient blocks the full recipe without partial deductions', () => {
  for (const recipe of menu) for (const key of Object.keys(recipe.needs)) {
    const stock = initialStock(); stock[key] = 0; const before = { ...stock };
    assert.equal(canCook(stock, recipe), false);
    assert.equal(consumeRecipe(stock, recipe), false);
    assert.deepEqual(stock, before);
  }
});
test('old potato stock becomes chips and retired shrimp are refunded at purchase value', () => {
  const old = { fish: 3, potato: 17, shrimp: 4 };
  assert.deepEqual(migrateStock(old), { stock: { fish: 3, chips: 17, peas: 8, lemon: 8, sauce: 8 }, refund: 20 });
  assert.deepEqual(old, { fish: 3, potato: 17, shrimp: 4 });
  assert.deepEqual(migrateStock({ fish: 0, chips: 0, peas: 0, lemon: 0, sauce: 0 }).stock, { fish: 0, chips: 0, peas: 0, lemon: 0, sauce: 0 });
});
