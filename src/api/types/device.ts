// ============= 与后端报文完全对齐的类型定义 =============

/** 统一API响应体 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp?: number
}

// ---------- 环境数据（HTTP data.data / WS data.data 共用，字符串格式，传感器故障时可能缺失或空字符串） ----------

export interface EnvData {
  tempAht?: string
  tempBmp?: string
  humidity?: string
  pressureHpa?: string
  altitude?: string
  iotDeviceOnlineCount?: number
  userDeviceOnlineCount?: number
}

// ---------- 设备信息（HTTP device / WS device 共用） ----------

export interface DeviceInfo {
  deviceId: string
  deviceStatus: number       // 1=在线 3=离线
  aht20Status: number        // 1=正常 其他=异常
  bmp280Status: number       // 1=正常 其他=异常
}

// ---------- 通用实时数据载荷（HTTP & WS 嵌套结构 共用） ----------

/**
 * 后端实际返回结构（HTTP响应data字段 / WS推送消息体 共用）
 * { type, data: EnvData, device: DeviceInfo, timestamp }
 */
export interface RealtimePayload {
  type: string               // "REAL_TIME_DATA"
  data: EnvData
  device: DeviceInfo
  timestamp: number | string
}

// ---------- WebSocket推送消息类型 ----------

/** WS推送消息（RealtimePayload 基础上附加 msgType 等WS特有字段） */
export interface WsRealtimeMessage extends RealtimePayload {
  msgType?: string           // 兼容：部分WS消息可能放在顶层 msgType（等价于 type）
}

/** @deprecated 兼容旧引用，等同于 WsRealtimeMessage */
export type RealTimeDataMessage = WsRealtimeMessage

// ---------- 跨页面共享数据 ----------

/** window.homePilotRealtime 结构 */
export interface HomePilotRealtime {
  tempAht: string
  humidity: string
  pressureHpa: string
  altitude: string
  iotDeviceOnlineCount: number
}

// ---------- 设备管理 ----------

/** Redis中设备最新快照 */
export interface DeviceLatestData {
  deviceId: string
  deviceStatus: number       // 1=在线 3=离线
  tempAht: number
  tempBmp: number
  humidity: number
  pressureHpa: number
  altitude: number
  aht20Status: number
  bmp280Status: number
  timestamp: number
}

/** 设备列表项 */
export interface DeviceListItem {
  deviceId: string
  deviceStatus: number
  tempAht: number
  humidity: number
  pressureHpa: number
  altitude: number
  aht20Status: number
  bmp280Status: number
  timestamp: number
}

/** 设备指令下发（DOWN_CMD） */
export interface DeviceCommand {
  cmdCode: 'device_restart' | 'sensor_calibrate' | 'light_switch'
  params: Record<string, unknown>
}

// ---------- 历史数据（InfluxDB查询返回） ----------

export interface HistoryDataPoint {
  timestamp: number
  tempAht: number
  tempBmp: number
  humidity: number
  pressureHpa: number
  altitude: number
}

// ---------- 日志 ----------

export interface LogEntry {
  id: string
  timestamp: number
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
}

// ---------- 通用请求入参 ----------

/** 获取设备最新状态请求 */
export interface DeviceLatestRequest {
  deviceId: string
}

/** 获取历史数据请求 */
export interface DeviceHistoryRequest {
  deviceId: string
  startTime: number
  endTime: number
}

/** 查询日志列表请求 */
export interface LogListRequest {
  level?: string
  page?: number
  size?: number
}

/** 下发设备指令请求 */
export interface DeviceCommandRequest {
  deviceId: string
  cmdCode: 'device_restart' | 'sensor_calibrate' | 'light_switch'
  params: Record<string, unknown>
}

/** 通用HTTP请求入参（Dashboard） */
export interface DashboardRequestParams {
  requestId: string
  timestamp: number
  sign: string
  userId: string
}

/** getTopDashboardData 返回的 data 结构（直接是对象，不是JSON字符串） */
export type DashboardDataResponse = RealtimePayload

// ---------- 全局WS连接状态 ----------

export type WsConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
