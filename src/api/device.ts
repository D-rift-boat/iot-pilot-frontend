import request from './index'
import type {
  ApiResponse,
  DeviceLatestData,
  DeviceListItem,
  HistoryDataPoint,
  LogEntry,
  // DashboardRequestParams,
  DashboardDataResponse,
  DeviceCommandRequest,
} from './types/device'

/** 基础公共参数（所有有请求体的接口必带） */
interface BaseCommonParams {
  requestId: string
  timestamp: number
  sign: string
}

/** 生成基础公共参数（requestId + timestamp + sign，不含userId） */
function buildCommonParams(): BaseCommonParams {
  const now = Date.now()
  const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '')
  return {
    requestId: `req-${dateStr}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: now,
    sign: '', // TODO: 接入真实签名算法
  }
}

/** 合并业务参数 + 基础公共参数 */
function withCommonParams<T extends object>(
    businessParams: T
): BaseCommonParams & T {
  return {
    ...buildCommonParams(),
    ...businessParams,
  }
}

/** 获取设备最新状态（Redis快照） */
export function getDeviceLatest(deviceId: string) {
  return request.post<ApiResponse<DeviceLatestData>>(
      '/api/v1/device/status',
      withCommonParams({ deviceId })
  )
}

/** 获取设备列表（无请求体，保持原样） */
export function getDeviceList() {
  return request.post<ApiResponse<DeviceListItem[]>>('/api/v1/device/list')
}

/** 获取历史数据（InfluxDB查询） */
export function getDeviceHistory(
    deviceId: string,
    startTime: number,
    endTime: number
) {
  return request.post<ApiResponse<HistoryDataPoint[]>>(
      '/api/v1/device/history',
      withCommonParams({ deviceId, startTime, endTime })
  )
}

/** 下发设备指令 */
export function sendDeviceCommand(
    deviceId: string,
    cmd: Pick<DeviceCommandRequest, 'cmdCode' | 'params'>
) {
  return request.post<ApiResponse<null>>(
      '/api/v1/device/command',
      withCommonParams({
        deviceId,
        cmdCode: cmd.cmdCode,
        params: cmd.params,
      })
  )
}

/** 获取在线设备数（无请求体，保持原样） */
export function getOnlineCount() {
  return request.post<ApiResponse<number>>(
      '/api/v1/device/iotDeviceOnlineCount'
  )
}

/** 查询日志列表 */
export function getLogList(params: {
  level?: string
  page?: number
  size?: number
}) {
  return request.post<ApiResponse<LogEntry[]>>(
      '/api/v1/log/list',
      withCommonParams(params)
  )
}

/** 获取Dashboard顶部实时数据（此接口需要userId） */
export async function getTopDashboardData(userId: string = 'admin') {
  const params = withCommonParams({ userId })
  const res = await request.post<ApiResponse<DashboardDataResponse>>(
      '/api/dashboard/getTopDashboardData',
      params
  )
  return {
    data: res.data.data,
    responseTimestamp:
        Number(res.data.data.timestamp) ?? res.data.timestamp ?? Date.now(),
  }
}
