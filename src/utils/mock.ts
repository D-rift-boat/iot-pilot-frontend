import type { RealTimeDataMessage } from '../api/types/device'

export function randomInRange(min: number, max: number, decimals = 6): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals))
}

/** 生成符合后端REAL_TIME_DATA格式的Mock数据（REAL_TIME_DATA 不包含在线数字段） */
export function generateMockRealTimeData(deviceId: string): RealTimeDataMessage {
  return {
    msgType: 'REAL_TIME_DATA',
    type: 'REAL_TIME_DATA',
    data: {
      tempAht: String(randomInRange(23, 29)),
      tempBmp: String(randomInRange(23.5, 30)),
      humidity: String(randomInRange(40, 70)),
      pressureHpa: String(randomInRange(985, 1020)),
      altitude: String(randomInRange(-30, 55, 2)),
    },
    device: {
      deviceId,
      deviceStatus: 1,
      aht20Status: 1,
      bmp280Status: 1,
    },
    timestamp: Date.now(),
  }
}
