// ============= 与后端报文完全对齐的类型定义 =============

/** 统一API响应体 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

// ---------- 设备上报数据（UP_DATA） ----------

/** 传感器状态 */
export interface SensorStatus {
  aht20: number   // 1=正常 3=离线
  bmp280: number
}

/** 环境数据 */
export interface EnvData {
  tempAht: number       // AHT20温度
  tempBmp: number       // BMP280温度
  humidity: number      // 湿度 %
  pressureHpa: number   // 气压 hPa
  altitude: number      // 海拔 m
}

/** 设备上报payload */
export interface DeviceUploadPayload {
  deviceStatus: number
  sensorStatus: SensorStatus
  envData: EnvData
  extend: Record<string, unknown>
}

// ---------- WebSocket推送实时数据（REAL_TIME_DATA） ----------

/** WS推送的实时数据（后端→前端） */
export interface RealTimeDataMessage {
  type: 'REAL_TIME_DATA'
  data: {
    tempAht: number
    humidity: number
    pressureHpa: number
    altitude: number
    iotDeviceOnlineCount: number
    userDeviceOnlineCount: number
  }
  device: {
    deviceId: string
    deviceStatus: number
    aht20Status: number
    bmp280Status: number
    tempBmp: number
  }
  timestamp: number
}

// ---------- 跨页面共享数据 ----------

/** window.homePilotRealtime 结构 */
export interface HomePilotRealtime {
  tempAht: number
  humidity: number
  pressureHpa: number
  altitude: number
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

// ---------- 全局WS连接状态 ----------

export type WsConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
