export function isOrderQrExpired(createdAt?: string | Date | null, now: Date = new Date()): boolean {
  if (!createdAt) return false;
  const orderDate = new Date(createdAt);
  if (isNaN(orderDate.getTime())) return false;

  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const orderIstTime = new Date(orderDate.getTime() + istOffsetMs);
  const year = orderIstTime.getUTCFullYear();
  const month = orderIstTime.getUTCMonth();
  const day = orderIstTime.getUTCDate();

  const expiryTimeMs = Date.UTC(year, month, day, 22, 0, 0, 0) - istOffsetMs;

  return now.getTime() > expiryTimeMs;
}
