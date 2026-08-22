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

/** 格式化设备状态 */
export function formatDeviceStatus(status: number): { text: string; type: 'success' | 'danger' } {
  return status === 1
    ? { text: '在线', type: 'success' }
    : { text: '离线', type: 'danger' }
}

/** 格式化传感器状态 */
export function formatSensorStatus(status: number): { text: string; type: 'success' | 'danger' } {
  return status === 1
    ? { text: '正常', type: 'success' }
    : { text: '异常', type: 'danger' }
}

/** 格式化完整时间戳 */
export function formatFullTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString('zh-CN', { hour12: false })
}

/** 传感器值安全展示：缺失/空字符串/undefined/null → '--' */
export function formatSensorValue(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') return '--'
  return String(val)
}

/** 时间戳格式化为 yyyy-MM-dd HH:mm:ss */
export function formatDateTime(ts: number | string): string {
  const d = new Date(typeof ts === 'string' ? Number(ts) : ts)
  if (isNaN(d.getTime())) return '--'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 数据延迟格式化：当前时间 - 数据时间戳 */
export function formatDataLatency(dataTimestamp: number | string): string {
  const ts = typeof dataTimestamp === 'string' ? Number(dataTimestamp) : dataTimestamp
  const delay = Date.now() - ts
  if (isNaN(delay) || delay < 0) return '--'

  if (delay < 1000) {
    return `${delay} ms`
  }
  if (delay < 60_000) {
    const s = Math.floor(delay / 1000)
    const ms = delay % 1000
    return `${s}s:${pad(ms)}ms`
  }
  if (delay < 3_600_000) {
    const min = Math.floor(delay / 60_000)
    const s = Math.floor((delay % 60_000) / 1000)
    const ms = delay % 1000
    return `${min}min:${pad(s)}s:${pad(ms)}ms`
  }
  if (delay < 86_400_000) {
    const h = Math.floor(delay / 3_600_000)
    const min = Math.floor((delay % 3_600_000) / 60_000)
    const s = Math.floor((delay % 60_000) / 1000)
    const ms = delay % 1000
    return `${h}h:${pad(min)}min:${pad(s)}s:${pad(ms)}ms`
  }
  // ≥24h
  const d = Math.floor(delay / 86_400_000)
  const h = Math.floor((delay % 86_400_000) / 3_600_000)
  const min = Math.floor((delay % 3_600_000) / 60_000)
  const s = Math.floor((delay % 60_000) / 1000)
  const ms = delay % 1000
  return `${d}d:${pad(h)}h:${pad(min)}min:${pad(s)}s:${pad(ms)}ms`
}
