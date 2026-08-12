import { ref, onUnmounted } from 'vue'
import type { DevicePayload } from '../api/types/device'
import { generateMockPayload } from '../utils/mock'

const WS_URL = 'ws://localhost:8080/ws/device'
const DEVICE_ID = 'esp32-S3-001'
const MOCK_INTERVAL = 5000

export function useWebSocket() {
  const data = ref<DevicePayload | null>(null)
  const connected = ref(false)
  const isMock = ref(false)
  const logs = ref<{ timestamp: number; level: string; message: string }[]>([])

  let ws: WebSocket | null = null
  let mockTimer: ReturnType<typeof setInterval> | null = null
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null

  function addLog(level: string, message: string) {
    logs.value.push({ timestamp: Date.now(), level, message })
    if (logs.value.length > 500) {
      logs.value = logs.value.slice(-500)
    }
  }

  function startMock() {
    if (mockTimer) return
    isMock.value = true
    addLog('WARN', 'WebSocket 未连通，已启用 Mock 数据模式')

    const payload = generateMockPayload(DEVICE_ID)
    data.value = payload
    addLog('INFO', `设备 ${DEVICE_ID} 上报传感器数据成功`)

    mockTimer = setInterval(() => {
      const payload = generateMockPayload(DEVICE_ID)
      data.value = payload
      addLog('INFO', `设备 ${DEVICE_ID} 上报传感器数据成功`)
    }, MOCK_INTERVAL)
  }

  function stopMock() {
    if (mockTimer) {
      clearInterval(mockTimer)
      mockTimer = null
    }
    isMock.value = false
  }

  function connect() {
    try {
      ws = new WebSocket(`${WS_URL}?deviceId=${DEVICE_ID}`)

      ws.onopen = () => {
        connected.value = true
        stopMock()
        addLog('INFO', `WebSocket 已连接，设备 ${DEVICE_ID}`)
      }

      ws.onmessage = (event) => {
        try {
          const payload: DevicePayload = JSON.parse(event.data)
          data.value = payload
          addLog('INFO', `设备 ${payload.deviceId} 上报传感器数据成功`)
        } catch {
          addLog('ERROR', '接收到无法解析的消息数据')
        }
      }

      ws.onerror = () => {
        addLog('ERROR', 'WebSocket 连接异常')
      }

      ws.onclose = () => {
        connected.value = false
        addLog('WARN', 'WebSocket 连接已断开')
        startMock()
      }
    } catch {
      addLog('ERROR', 'WebSocket 创建失败，降级为 Mock 模式')
      startMock()
    }
  }

  function disconnect() {
    if (ws) {
      ws.close()
      ws = null
    }
    stopMock()
    if (fallbackTimer) {
      clearTimeout(fallbackTimer)
      fallbackTimer = null
    }
  }

  function clearLogs() {
    logs.value = []
  }

  // 发起连接
  connect()

  // 5秒后若仍未连接，启动 Mock 降级
  fallbackTimer = setTimeout(() => {
    if (!connected.value && !mockTimer) {
      startMock()
    }
  }, 5000)

  // 组件卸载时清理
  onUnmounted(() => {
    disconnect()
  })

  return {
    data,
    connected,
    isMock,
    logs,
    clearLogs,
    disconnect,
  }
}
