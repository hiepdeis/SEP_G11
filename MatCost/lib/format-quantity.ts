export function formatQuantity(quantity: number | undefined | null): string | number {
  if (quantity === undefined || quantity === null) return 0;
  return quantity % 1 === 0 ? quantity : quantity.toFixed(3);
}
