import { ref, shallowRef } from 'vue'
import type { RealTimeDataMessage, HomePilotRealtime, WsConnectionState } from '../api/types/device'
import { generateMockRealTimeData } from '../utils/mock'

// ============ 常量配置 ============
const WS_URL = 'ws://localhost:8080/ws/device'
const DEVICE_ID = 'laptop'
const USER_ID = 'admin'
const HEARTBEAT_INTERVAL = 30_000     // 30s心跳
const MAX_NO_PONG_COUNT = 2           // 连续2轮无pong→重连
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 10000] // 指数退避
const MOCK_INTERVAL = 5000
const MOCK_FALLBACK_DELAY = 5000      // 5s连不上则降级Mock

// ============ 全局单例状态（模块级变量，跨组件共享） ============
const globalData = shallowRef<RealTimeDataMessage | null>(null)
const globalConnectionState = ref<WsConnectionState>('disconnected')
const globalOnlineCount = ref(0)
const globalIsMock = ref(false)
const globalLogs = ref<{ timestamp: number; level: string; message: string }[]>([])

let globalWs: WebSocket | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let mockTimer: ReturnType<typeof setInterval> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
let retryCount = 0
let noPongCount = 0
let isManualClose = false

// 跨页面共享：挂载到window
function updateWindowRealtime(msg: RealTimeDataMessage) {
  const realtime: HomePilotRealtime = {
    tempAht: msg.data.tempAht,
    humidity: msg.data.humidity,
    pressureHpa: msg.data.pressureHpa,
    altitude: msg.data.altitude,
    onlineCount: msg.data.onlineCount,
  }
  ;(window as any).homePilotRealtime = realtime
}

function addLog(level: string, message: string) {
  globalLogs.value.push({ timestamp: Date.now(), level, message })
  if (globalLogs.value.length > 500) {
    globalLogs.value = globalLogs.value.slice(-500)
  }
}

// ============ 心跳机制 ============
function startHeartbeat() {
  stopHeartbeat()
  noPongCount = 0
  heartbeatTimer = setInterval(() => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      if (noPongCount >= MAX_NO_PONG_COUNT) {
        addLog('WARN', `连续${MAX_NO_PONG_COUNT}轮无心跳回应，触发重连`)
        stopHeartbeat()
        globalWs?.close()
        return
      }
      globalWs.send('ping')
      noPongCount++
    }
  }, HEARTBEAT_INTERVAL)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// ============ 指数退避重连 ============
function scheduleReconnect() {
  if (isManualClose) return
  const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)]
  retryCount++
  globalConnectionState.value = 'reconnecting'
  addLog('WARN', `将在 ${delay}ms 后进行第 ${retryCount} 次重连...`)
  retryTimer = setTimeout(() => {
    connect()
  }, delay)
}

function resetRetryCount() {
  retryCount = 0
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
}

// ============ Mock降级 ============
function startMock() {
  if (mockTimer) return
  globalIsMock.value = true
  addLog('WARN', 'WebSocket 不可用，已启用 Mock 数据模式')

  const mockMsg = generateMockRealTimeData(DEVICE_ID)
  globalData.value = mockMsg
  globalOnlineCount.value = mockMsg.data.onlineCount
  updateWindowRealtime(mockMsg)

  mockTimer = setInterval(() => {
    const msg = generateMockRealTimeData(DEVICE_ID)
    globalData.value = msg
    globalOnlineCount.value = msg.data.onlineCount
    updateWindowRealtime(msg)
    addLog('INFO', `设备 ${DEVICE_ID} 上报传感器数据成功`)
  }, MOCK_INTERVAL)
}

function stopMock() {
  if (mockTimer) {
    clearInterval(mockTimer)
    mockTimer = null
  }
  globalIsMock.value = false
}

// ============ 核心连接逻辑 ============
function connect() {
  if (globalWs?.readyState === WebSocket.OPEN) return

  try {
    const wsUrl = `${WS_URL}?userId=${USER_ID}&deviceId=${DEVICE_ID}`
    globalWs = new WebSocket(wsUrl)
    globalConnectionState.value = 'connecting'

    globalWs.onopen = () => {
      globalConnectionState.value = 'connected'
      resetRetryCount()
      stopMock()
      startHeartbeat()
      addLog('INFO', `WebSocket 已连接，设备 ${DEVICE_ID}`)
    }

    globalWs.onmessage = (event) => {
      // 心跳pong回应
      if (event.data === 'pong') {
        noPongCount = 0
        return
      }
      try {
        const msg: RealTimeDataMessage = JSON.parse(event.data)
        if (msg.type === 'REAL_TIME_DATA') {
          globalData.value = msg
          globalOnlineCount.value = msg.data.onlineCount
          updateWindowRealtime(msg)
          addLog('INFO', `设备 ${msg.device.deviceId} 上报传感器数据成功`)
        }
      } catch {
        addLog('ERROR', '接收到无法解析的消息数据')
      }
    }

    globalWs.onerror = () => {
      addLog('ERROR', 'WebSocket 连接异常')
    }

    globalWs.onclose = () => {
      globalConnectionState.value = 'disconnected'
      stopHeartbeat()
      addLog('WARN', 'WebSocket 连接已断开')
      if (!isManualClose) {
        scheduleReconnect()
      }
    }
  } catch {
    addLog('ERROR', 'WebSocket 创建失败')
    scheduleReconnect()
  }
}

function disconnect() {
  isManualClose = true
  stopHeartbeat()
  stopMock()
  resetRetryCount()
  if (fallbackTimer) {
    clearTimeout(fallbackTimer)
    fallbackTimer = null
  }
  if (globalWs) {
    globalWs.close()
    globalWs = null
  }
  globalConnectionState.value = 'disconnected'
}

function clearLogs() {
  globalLogs.value = []
}

// ============ 模块加载时自动连接 ============
connect()

// 5秒后若仍未连接，启动 Mock 降级
fallbackTimer = setTimeout(() => {
  if (globalConnectionState.value !== 'connected' && !mockTimer) {
    startMock()
  }
}, MOCK_FALLBACK_DELAY)

// ============ 导出composable（单例模式） ============
export function useWebSocket() {
  return {
    data: globalData,
    connectionState: globalConnectionState,
    onlineCount: globalOnlineCount,
    isMock: globalIsMock,
    logs: globalLogs,
    clearLogs,
    disconnect,
  }
}
