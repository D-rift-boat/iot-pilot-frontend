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

/** 传感器值安全展示：缺失/空字符串/undefined/null → '--'；数值最多保留2位小数 */
export function formatSensorValue(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') return '--'
  const n = Number(val)
  if (isNaN(n)) return String(val)
  // 保留最多2位小数（去除尾部多余的0）
  const fixed = n.toFixed(2)
  return parseFloat(fixed).toString()
}

/** 时间戳格式化为 yyyy-MM-dd HH:mm:ss */
export function formatDateTime(ts: number | string): string {
  const d = new Date(typeof ts === 'string' ? Number(ts) : ts)
  if (isNaN(d.getTime())) return '--'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 
 * 数据延迟格式化：当前时间 - 数据时间戳
 * @param dataTimestamp 数据时间戳（毫秒级）
 * @param showUnit 是否显示单位（默认false）
 * @returns 格式化后的延迟字符串
 */
export function formatDataLatency(dataTimestamp: number | string, showUnit = false): string {
  const ts = typeof dataTimestamp === 'string' ? Number(dataTimestamp) : dataTimestamp
  const delay = Date.now() - ts
  // 100天 毫秒：100 * 86400000
  const MAX_ALLOW_MS = 100 * 86_400_000
  if (isNaN(delay) || delay < 0) return '--'
  if (delay > MAX_ALLOW_MS) {
    return '100天以上'
  }

  const pad2 = (v: number) => v.toString().padStart(2, '0')
  const pad3 = (v: number) => v.toString().padStart(3, '0')

  const d = Math.floor(delay / 86_400_000)
  const h = Math.floor((delay % 86_400_000) / 3_600_000)
  const min = Math.floor((delay % 3_600_000) / 60_000)
  const s = Math.floor((delay % 60_000) / 1000)
  const ms = delay % 1000

  if (showUnit) {
    return `${pad2(d)}d:${pad2(h)}h:${pad2(min)}min:${pad2(s)}s:${pad3(ms)}ms`
  } else {
    return `${pad2(d)}:${pad2(h)}:${pad2(min)}:${pad2(s)}:${pad3(ms)}`
  }
}
