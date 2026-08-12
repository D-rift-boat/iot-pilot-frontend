export function randomInRange(min: number, max: number, decimals = 1): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

export function generateMockPayload(deviceId: string) {
  return {
    deviceId,
    timestamp: Date.now(),
    aht20Temp: randomInRange(23, 29),
    bmp280Temp: randomInRange(23.5, 30),
    humidity: randomInRange(40, 70),
    pressure: randomInRange(1010, 1020),
    altitude: randomInRange(35, 55, 0),
    status: 'online' as const,
  }
}
