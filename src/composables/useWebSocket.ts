import { ref, shallowRef } from 'vue'
import type { RealTimeDataMessage, HomePilotRealtime, WsConnectionState } from '../api/types/device'
import { generateMockRealTimeData } from '../utils/mock'

// ============ 常量配置 ============
const WS_URL = 'ws://localhost:8080/ws'
const USER_DEVICE_ID = 'laptop'
const USER_ID = 'admin'
const HEARTBEAT_INTERVAL = 1_000     // 30s心跳
const MAX_NO_PONG_COUNT = 2           // 连续2轮无pong→重连
// const RETRY_DELAYS = [1000, 2000, 4000, 8000, 10000] // 指数退避
const RETRY_DELAYS = [1] // 指数退避
const MOCK_INTERVAL = 5000
const MOCK_FALLBACK_DELAY = 5000      // 5s连不上则降级Mock
// ============ 全局单例状态（模块级变量，跨组件共享） ============


const globalData = shallowRef<RealTimeDataMessage | null>(null)
const globalConnectionState = ref<WsConnectionState>('disconnected')
const globalsensorDeviceOnlineCount = ref(0)
const userDeviceOnlineCount = ref(0)
const globalIsMock = ref(false)
const globalLogs = ref<{ timestamp: number; level: string; message: string }[]>([])
let globalWs: WebSocket | null = null

let isHeartbeatTimeoutClose = false //新增
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
    iotDeviceOnlineCount: msg.data.iotDeviceOnlineCount,
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
        isHeartbeatTimeoutClose = true //标记是心跳超时关闭
        globalWs?.close()
        return
      }
      globalWs.send(JSON.stringify({"type":"ping"}))
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

/**
 * 重置重连次数
 */
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

  const mockMsg = generateMockRealTimeData(USER_DEVICE_ID)
  globalData.value = mockMsg
  globalsensorDeviceOnlineCount.value = mockMsg.data.iotDeviceOnlineCount
  updateWindowRealtime(mockMsg)

  mockTimer = setInterval(() => {
    const msg = generateMockRealTimeData(USER_DEVICE_ID)
    globalData.value = msg
    globalsensorDeviceOnlineCount.value = msg.data.iotDeviceOnlineCount
    updateWindowRealtime(msg)
    addLog('INFO', `设备 ${USER_DEVICE_ID} 上报传感器数据成功`)
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
/**
 * 建立WebSocket连接
 */
function connect() {
  if (globalWs?.readyState === WebSocket.OPEN) return

  try {
    const wsUrl = `${WS_URL}?userId=${USER_ID}&deviceId=${USER_DEVICE_ID}`
    globalWs = new WebSocket(wsUrl)
    globalConnectionState.value = 'connecting'

    globalWs.onopen = () => {
      globalConnectionState.value = 'connected'
      resetRetryCount()
      stopMock()
      startHeartbeat()
      addLog('INFO', `WebSocket 已连接，设备 ${USER_DEVICE_ID}`)
    }

    globalWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      // 心跳pong回应
      if (msg.type === 'pong') {
        noPongCount = 0
        return
      }
      try {
        const msg: RealTimeDataMessage = JSON.parse(event.data)
        if (msg.type === 'REAL_TIME_DATA') {
          globalData.value = msg
          globalsensorDeviceOnlineCount.value = msg.data.iotDeviceOnlineCount
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

      // 取出上一次的设备id，断开弹窗使用
      if(isHeartbeatTimeoutClose) {
        // const userDeviceId = USER_DEVICE_ID
        // 重置全局数据
        // globalData.value = null
        // globalsensorDeviceOnlineCount.value = 0
        // 弹出失联提示，3s渐隐消失
        // showDeviceLostToast(userDeviceId)
      }

      if (!isManualClose) {
        scheduleReconnect()
      }
    }
  } catch {
    addLog('ERROR', 'WebSocket 创建失败')
    scheduleReconnect()
  }
}

/**
 * 设备失联toast弹窗，3秒内渐隐自动关闭
 * @param {string} deviceId
 */
function showDeviceLostToast(userDeviceId : string) {
  const toastText = userDeviceId ? `设备 ${userDeviceId} 已失联下线` : `设备已失联`

  // 创建dom
  const toastEl = document.createElement('div')
  toastEl.innerText = toastText
  // 基础样式 + 渐隐动画
  toastEl.style.cssText = `
    position: fixed;
    top:24px;
    right:24px;
    background:#dc2626;
    color:#fff;
    padding:12px 20px;
    border-radius:6px;
    z-index:9999;
    font-size:14px;
    opacity:1;
    transition: opacity 3s ease;
  `
  document.body.appendChild(toastEl)

  // 触发渐隐
  setTimeout(() => {
    toastEl.style.opacity = '0'
  }, 0)

  // 动画结束移除dom，transition3s，多等100ms
  setTimeout(() => {
    toastEl.remove()
  }, 10100)
}

/**
 * 断开连接
 */
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

/**
 * 清空日志
 */
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
    iotDeviceOnlineCount: globalsensorDeviceOnlineCount,
    userDeviceOnlineCount: userDeviceOnlineCount,
    isMock: globalIsMock,
    logs: globalLogs,
    clearLogs,
    disconnect,
  }
}
