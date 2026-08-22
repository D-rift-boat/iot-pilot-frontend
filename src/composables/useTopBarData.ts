import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getTopDashboardData } from '../api/device'
import { useWebSocket } from './useWebSocket'
import { formatSensorValue, formatDateTime, formatDataLatency } from '../utils/format'
import type { EnvData, DeviceInfo } from '../api/types/device'

// ============ 全局单例状态（HTTP初始数据，WS更新后覆盖） ============
const httpEnvData = ref<EnvData | null>(null)
const httpDeviceInfo = ref<DeviceInfo | null>(null)
const httpIotOnlineCount = ref<number>(0)
const httpUserOnlineCount = ref<number>(0)

// 数据时间戳：HTTP用响应timestamp，WS用消息timestamp
const dataTimestamp = ref<number>(0)
// 延迟刷新tick：每秒自增，强制latencyStr重新计算Date.now()
const latencyTick = ref<number>(0)

let latencyTimer: ReturnType<typeof setInterval> | null = null

export function useTopBarData() {
  const {
    data: wsData,
    connectionState,
    iotDeviceOnlineCount: wsIotCount,
    userDeviceOnlineCount: wsUserCount,
    hasReceivedIotCountUpdate,
    hasReceivedUserCountUpdate,
  } = useWebSocket()

  // ============ 当前展示值（HTTP → WS优先级，WS有数据则用WS） ============
  const tempAht = computed(() => {
    if (wsData.value) return formatSensorValue(wsData.value.data.tempAht)
    return formatSensorValue(httpEnvData.value?.tempAht)
  })

  const tempBmp = computed(() => {
    if (wsData.value) return formatSensorValue(wsData.value.data.tempBmp)
    return formatSensorValue(httpEnvData.value?.tempBmp)
  })

  const humidity = computed(() => {
    if (wsData.value) return formatSensorValue(wsData.value.data.humidity)
    return formatSensorValue(httpEnvData.value?.humidity)
  })

  const pressure = computed(() => {
    if (wsData.value) return formatSensorValue(wsData.value.data.pressureHpa)
    return formatSensorValue(httpEnvData.value?.pressureHpa)
  })

  const altitude = computed(() => {
    if (wsData.value) return formatSensorValue(wsData.value.data.altitude)
    return formatSensorValue(httpEnvData.value?.altitude)
  })

  // 设备在线状态（deviceStatus: 1=在线）
  const deviceOnline = computed(() => {
    if (wsData.value) return wsData.value.device.deviceStatus === 1
    return httpDeviceInfo.value?.deviceStatus === 1
  })

  // 在线设备数：WS未收到独立通知 → 用HTTP初始快照；收到独立通知 → 用WS实时值
  const iotOnlineCount = computed(() => {
    if (hasReceivedIotCountUpdate.value) return wsIotCount.value
    if (wsData.value?.data.iotDeviceOnlineCount !== undefined) return wsData.value.data.iotDeviceOnlineCount
    return httpIotOnlineCount.value
  })

  const userOnlineCount = computed(() => {
    if (hasReceivedUserCountUpdate.value) return wsUserCount.value
    if (wsData.value?.data.userDeviceOnlineCount !== undefined) return wsData.value.data.userDeviceOnlineCount
    return httpUserOnlineCount.value
  })

  // 更新时间
  const updateTimeStr = computed(() => dataTimestamp.value ? formatDateTime(dataTimestamp.value) : '--')
  // 延迟（依赖 latencyTick 强制每秒刷新）
  const latencyStr = computed(() => {
    // 读取 tick 建立响应式依赖，不使用其值
    latencyTick.value
    return dataTimestamp.value ? formatDataLatency(dataTimestamp.value) : '--'
  })

  // 连接状态
  const connectionLabel = computed(() => {
    switch (connectionState.value) {
      case 'connected': return '已连接'
      case 'connecting': return '连接中...'
      case 'reconnecting': return '重连中...'
      default: return '未连接'
    }
  })

  // ============ WS数据更新 → 覆盖HTTP数据、更新时间戳 ============
  watch(wsData, (val) => {
    if (val) {
      dataTimestamp.value = Number(val.timestamp)
    }
  })

  // 当WS尚未推送时，用WS模块的在线设备数
  watch([wsIotCount, wsUserCount], ([iot, user]) => {
    if (!wsData.value) {
      httpIotOnlineCount.value = iot
      httpUserOnlineCount.value = user
    }
  })

  // ============ HTTP初始加载 ============
  onMounted(async () => {
    try {
      const result = await getTopDashboardData()
      httpEnvData.value = result.data.data
      httpDeviceInfo.value = result.data.device
      httpIotOnlineCount.value = result.data.data.iotDeviceOnlineCount ?? 0
      httpUserOnlineCount.value = result.data.data.userDeviceOnlineCount ?? 0
      dataTimestamp.value = result.responseTimestamp
    } catch (e) {
      console.warn('getTopDashboardData 请求失败，等待WS数据', e)
    }
  })

  // ============ 延迟计时器（每秒自增tick → 触发latencyStr重算） ============
  if (!latencyTimer) {
    latencyTimer = setInterval(() => {
      latencyTick.value++
    }, 1000)
  }

  onUnmounted(() => {
    if (latencyTimer) {
      clearInterval(latencyTimer)
      latencyTimer = null
    }
  })

  return {
    tempAht,
    tempBmp,
    humidity,
    pressure,
    altitude,
    deviceOnline,
    iotOnlineCount,
    userOnlineCount,
    connectionState,
    connectionLabel,
    updateTimeStr,
    latencyStr,
  }
}
