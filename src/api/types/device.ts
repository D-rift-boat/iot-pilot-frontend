export interface DevicePayload {
  deviceId: string
  timestamp: number
  aht20Temp: number
  bmp280Temp: number
  humidity: number
  pressure: number
  altitude: number
  status: 'online' | 'offline'
}

export interface DeviceInfo {
  deviceId: string
  name: string
  status: 'online' | 'offline'
  lastOnline: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

export interface LogEntry {
  id: string
  timestamp: number
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
}
