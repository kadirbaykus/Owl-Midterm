export const ingredients = [
  { key: 'fish', name: 'Fish', icon: '🐟', qty: 6, cost: 30 },
  { key: 'chips', name: 'Chips', icon: '🍟', qty: 12, cost: 18 },
  { key: 'peas', name: 'Peas', icon: '🫛', qty: 8, cost: 16 },
  { key: 'lemon', name: 'Lemon', icon: '🍋', qty: 8, cost: 16 },
  { key: 'sauce', name: 'Sauce', icon: '🥣', qty: 8, cost: 16 },
];

// One unit of each listed ingredient makes one meal.
export const menu = [
  { name: 'Classic Fish & Chips', price: 24, rep: 12, needs: { fish: 1, chips: 1 } },
  { name: 'Lemon Fish & Chips', price: 28, rep: 14, needs: { fish: 1, chips: 1, lemon: 1 } },
  { name: 'Saucy Fish & Chips', price: 28, rep: 14, needs: { fish: 1, chips: 1, sauce: 1 } },
  { name: 'Pea Combo Meal', price: 28, rep: 14, needs: { fish: 1, chips: 1, peas: 1 } },
  { name: 'Light Fish Plate', price: 26, rep: 13, needs: { fish: 1, peas: 1, lemon: 1 } },
  { name: 'Street Chips', price: 16, rep: 8, needs: { chips: 1, sauce: 1, lemon: 1 } },
  { name: 'Green Fish Basket', price: 28, rep: 14, needs: { fish: 1, peas: 1, sauce: 1 } },
  { name: 'Lemon Fish Portion', price: 28, rep: 14, needs: { fish: 1, lemon: 1, sauce: 1 } },
  { name: 'Crispy Chips Basket', price: 18, rep: 9, needs: { chips: 1, peas: 1, sauce: 1 } },
  { name: 'Saucy Chips', price: 12, rep: 6, needs: { chips: 1, sauce: 1 } },
].map((dish, art) => ({ ...dish, art }));
export const initialStock = () => ({ fish: 12, chips: 16, peas: 8, lemon: 8, sauce: 8 });
export function canCook(stock, recipe) {
  return Object.entries(recipe.needs).every(([key, amount]) => (stock[key] ?? 0) >= amount);
}
export function consumeRecipe(stock, recipe) {
  if (!canCook(stock, recipe)) return false;
  for (const [key, amount] of Object.entries(recipe.needs)) stock[key] -= amount;
  return true;
}
export function migrateStock(stock) {
  const defaults = initialStock();
  return {
    stock: Object.fromEntries(ingredients.map(({ key }) => [key, stock[key] ?? (key === 'chips' ? stock.potato : undefined) ?? defaults[key]])),
    refund: Math.max(0, stock.shrimp ?? 0) * 5,
  };
}
export const recipeText = recipe => Object.entries(recipe.needs).map(([key, amount]) => `${amount} ${ingredients.find(i => i.key === key).name}`).join(' · ');
