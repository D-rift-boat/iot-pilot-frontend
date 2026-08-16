import type { RealTimeDataMessage } from '../api/types/device'

export function randomInRange(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

/** 生成符合后端REAL_TIME_DATA格式的Mock数据 */
export function generateMockRealTimeData(deviceId: string): RealTimeDataMessage {
  return {
    type: 'REAL_TIME_DATA',
    data: {
      tempAht: randomInRange(23, 29),
      humidity: randomInRange(40, 70),
      pressureHpa: randomInRange(985, 1020),
      altitude: randomInRange(-30, 55, 0),
      iotDeviceOnlineCount: 1,
    },
    device: {
      deviceId,
      deviceStatus: 1,
      aht20Status: 1,
      bmp280Status: 1,
      tempBmp: randomInRange(23.5, 30),
    },
    timestamp: Date.now(),
  }
}
