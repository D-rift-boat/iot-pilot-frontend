export function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

export function formatTemp(val: number): string {
  return val.toFixed(1) + '°C'
}

export function formatHumidity(val: number): string {
  return val.toFixed(1) + '%'
}

export function formatPressure(val: number): string {
  return val.toFixed(1) + ' hPa'
}

export function getComfortLevel(humidity: number): string {
  if (humidity >= 40 && humidity <= 60) return '舒适'
  if (humidity > 60 && humidity <= 70) return '偏湿'
  if (humidity > 70) return '潮湿'
  if (humidity < 40 && humidity >= 30) return '偏干'
  return '干燥'
}

export function getTrend(arr: number[]): 'up' | 'down' | 'stable' {
  if (arr.length < 2) return 'stable'
  const diff = arr[arr.length - 1] - arr[arr.length - 2]
  if (diff > 0.3) return 'up'
  if (diff < -0.3) return 'down'
  return 'stable'
}
