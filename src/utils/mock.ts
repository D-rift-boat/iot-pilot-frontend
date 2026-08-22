import type { RealTimeDataMessage } from '../api/types/device'

export function randomInRange(min: number, max: number, decimals = 2): string {
  return (Math.random() * (max - min) + min).toFixed(decimals)
}

/** 生成符合后端REAL_TIME_DATA格式的Mock数据（传感器值为字符串） */
export function generateMockRealTimeData(deviceId: string): RealTimeDataMessage {
  const tempBmpVal = randomInRange(23.5, 30)
  return {
    msgType: 'REAL_TIME_DATA',
    type: 'REAL_TIME_DATA',
    data: {
      tempAht: randomInRange(23, 29),
      tempBmp: tempBmpVal,
      humidity: randomInRange(40, 70),
      pressureHpa: randomInRange(985, 1020),
      altitude: randomInRange(-30, 55, 0),
      iotDeviceOnlineCount: 1,
      userDeviceOnlineCount: 2,
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
