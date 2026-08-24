<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useWebSocket } from '../composables/useWebSocket'
import { getDeviceHistory } from '../api/device'
import dayjs from 'dayjs'

const { data, isMock } = useWebSocket()

const tempHumidChartRef = ref<HTMLElement>()
const pressureChartRef = ref<HTMLElement>()
let tempHumidChart: echarts.ECharts | null = null
let pressureChart: echarts.ECharts | null = null

const DEVICE_ID = 'esp32-S3-001'
const MAX_POINTS = 50

// ========== 数据间隔连续修复：需要断开连续
/** 数据点最大允许间隔（毫秒），超过则认为无数据，连线断开 */
const MAX_GAP_MS = 5 * 60 * 1000

/**
 * 在数据点间隔过大时插入 null 点，打断 ECharts 连线
 * connectNulls: false 时，遇到 null 点会自动断开
 */
function breakLargeGaps(data: DataPoint[], maxGapMs: number = MAX_GAP_MS): DataPoint[] {
  if (data.length < 2) return data
  const result: DataPoint[] = []
  for (let i = 0; i < data.length; i++) {
    result.push(data[i])
    if (i < data.length - 1) {
      const currentTime = data[i][0]
      const nextTime = data[i + 1][0]
      if (nextTime - currentTime > maxGapMs) {
        // 紧接当前点后插入 null（+1ms），连线在此断开
        result.push([currentTime + 1, null])
      }
    }
  }
  return result
}

// ==================== 时间范围状态 ====================
type ViewMode = 'realtime' | 'custom'
const timeRange = ref('1h')
const customTimeRange = ref<[number, number] | null>(null)
const customRangeBound = ref<{ start: number; end: number } | null>(null)
const viewMode = ref<ViewMode>('realtime')
const currentRangeMs = ref(3_600_000)

const RANGE_MAP: Record<string, number> = {
  '10m': 600_000,
  '1h': 3_600_000,
  '6h': 21_600_000,
  '24h': 86_400_000,
}

// ==================== 图表数据（[timestamp, value] 格式，适配 time 轴） ====================
type DataPoint = [number, number | null]
const aht20TempData = ref<DataPoint[]>([])
const bmp280TempData = ref<DataPoint[]>([])
const humidityData = ref<DataPoint[]>([])
const pressureData = ref<DataPoint[]>([])

// ==================== 工具函数 ====================
/** 安全转数字，无效返回 null（ECharts 用 null 断点） */
function safeNum(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null || val === '') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

/** 保留两位小数 */
function fix2(val: number | null): number | null {
  return val === null ? null : Math.round(val * 100) / 100
}

/** 根据时间范围选择 x 轴标签格式 */
function formatAxisLabel(timestamp: number): string {
  if (currentRangeMs.value <= 3_600_000) {
    return dayjs(timestamp).format('HH:mm:ss')
  }
  return dayjs(timestamp).format('MM-DD HH:mm')
}

/** tooltip 数值格式化 */
function formatTooltipVal(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '--'
  return val.toFixed(2)
}

// ==================== 历史数据加载 ====================
async function fetchHistory(startTime: number, endTime: number) {
  try {
    const res = await getDeviceHistory(DEVICE_ID, startTime, endTime)
    const historyPoints = res.data.data

    if (historyPoints && historyPoints.length > 0) {
      aht20TempData.value = historyPoints.map(p =>
          [Number(p.reportTime), fix2(safeNum(p.temperatureAht))] as DataPoint
      )
      bmp280TempData.value = historyPoints.map(p =>
          [Number(p.reportTime), fix2(safeNum(p.temperatureBmp))] as DataPoint
      )
      humidityData.value = historyPoints.map(p =>
          [Number(p.reportTime), fix2(safeNum(p.humidity))] as DataPoint
      )
      pressureData.value = historyPoints.map(p =>
          [Number(p.reportTime), fix2(safeNum(p.pressureHpa))] as DataPoint
      )

      // 关键：间隔过大处插入 null，打断连线
      aht20TempData.value = breakLargeGaps(aht20TempData.value)
      bmp280TempData.value = breakLargeGaps(bmp280TempData.value)
      humidityData.value = breakLargeGaps(humidityData.value)
      pressureData.value = breakLargeGaps(pressureData.value)
    } else {
      clearAllData()
    }
    updateCharts()
  } catch {
    // 接口不可用时保持空图表，等待WS实时数据填充
  }
}

/** 快捷范围加载（实时滚动模式） */
function loadByRange(range: string) {
  viewMode.value = 'realtime'
  currentRangeMs.value = RANGE_MAP[range] || 3_600_000
  const endTime = Date.now()
  const startTime = endTime - currentRangeMs.value
  fetchHistory(startTime, endTime)
}

/** 自定义时间段加载（固定范围，不自动滚动） */
function loadByCustom(startTime: number, endTime: number) {
  viewMode.value = 'custom'
  currentRangeMs.value = endTime - startTime
  customRangeBound.value = { start: startTime, end: endTime }
  fetchHistory(startTime, endTime)
}

/** 快捷范围切换 */
function handleRangeChange(val: string) {
  customTimeRange.value = null
  customRangeBound.value = null
  loadByRange(val)
}

/** 自定义时间段切换 */
function handleCustomRangeChange(val: [number, number] | null) {
  if (!val || val.length !== 2) return
  timeRange.value = ''
  loadByCustom(val[0], val[1])
}

function clearAllData() {
  aht20TempData.value = []
  bmp280TempData.value = []
  humidityData.value = []
  pressureData.value = []
}

// ==================== WS 实时数据追加 ====================
function pushData(msg: NonNullable<typeof data.value>) {
  const time = Number(msg.timestamp)
  if (isNaN(time)) return

  const tAht = fix2(safeNum(msg.data.tempAht))
  const tBmp = fix2(safeNum(msg.data.tempBmp))
  const h = fix2(safeNum(msg.data.humidity))
  const p = fix2(safeNum(msg.data.pressureHpa))

  if (tAht === null && tBmp === null && h === null && p === null) return

  // 关键：与最后一个有数据的点间隔过大时，先插入 null 断开
  const lastPoint = aht20TempData.value[aht20TempData.value.length - 1]
  if (lastPoint && lastPoint[1] !== null && time - lastPoint[0] > MAX_GAP_MS) {
    const breakTime = lastPoint[0] + 1
    aht20TempData.value.push([breakTime, null])
    bmp280TempData.value.push([breakTime, null])
    humidityData.value.push([breakTime, null])
    pressureData.value.push([breakTime, null])
  }

  aht20TempData.value.push([time, tAht])
  bmp280TempData.value.push([time, tBmp])
  humidityData.value.push([time, h])
  pressureData.value.push([time, p])

  // 保留最近 MAX_POINTS 个点
  while (aht20TempData.value.length > MAX_POINTS) {
    aht20TempData.value.shift()
    bmp280TempData.value.shift()
    humidityData.value.shift()
    pressureData.value.shift()
  }

  updateCharts()
}

// ==================== 图表初始化 ====================
function buildTooltipFormatter() {
  return (params: any) => {
    if (!params || params.length === 0) return ''
    const time = dayjs(params[0].axisValue).format('YYYY-MM-DD HH:mm:ss')
    let html = `<div style="font-weight:600;margin-bottom:4px">${time}</div>`
    params.forEach((item: any) => {
      const val = formatTooltipVal(item.value?.[1])
      html += `${item.marker}${item.seriesName}: ${val}<br/>`
    })
    return html
  }
}

function initTempHumidChart() {
  if (!tempHumidChartRef.value) return
  tempHumidChart = echarts.init(tempHumidChartRef.value)
  tempHumidChart.setOption({
    tooltip: { trigger: 'axis', formatter: buildTooltipFormatter() },
    legend: {
      data: ['AHT20 温度', 'BMP280 温度', '湿度'],
      bottom: 0,
      textStyle: { color: '#8C8C8C' },
    },
    grid: { top: 20, right: 60, bottom: 40, left: 50 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#E8E8E3' } },
      axisLabel: {
        color: '#8C8C8C',
        fontSize: 11,
        formatter: (value: number) => formatAxisLabel(value),
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '°C',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E8E8E3', type: 'dashed' } },
        axisLabel: {
          color: '#8C8C8C',
          formatter: (val: number) => val.toFixed(2),
        },
      },
      {
        type: 'value',
        name: '%',
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: '#8C8C8C',
          formatter: (val: number) => val.toFixed(2),
        },
      },
    ],
    series: [
      {
        name: 'AHT20 温度',
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        data: aht20TempData.value,
        lineStyle: { color: '#7BA39E', width: 2 },
        itemStyle: { color: '#7BA39E' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(123,163,158,0.2)' },
            { offset: 1, color: 'rgba(123,163,158,0.02)' },
          ]) as any,
        },
      },
      {
        name: 'BMP280 温度',
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        data: bmp280TempData.value,
        lineStyle: { color: '#8E9AAF', width: 2 },
        itemStyle: { color: '#8E9AAF' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(142,154,175,0.2)' },
            { offset: 1, color: 'rgba(142,154,175,0.02)' },
          ]) as any,
        },
      },
      {
        name: '湿度',
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        yAxisIndex: 1,
        data: humidityData.value,
        lineStyle: { color: '#A3B18A', width: 2 },
        itemStyle: { color: '#A3B18A' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(163,177,138,0.2)' },
            { offset: 1, color: 'rgba(163,177,138,0.02)' },
          ]) as any,
        },
      },
    ],
  })
}

function initPressureChart() {
  if (!pressureChartRef.value) return
  pressureChart = echarts.init(pressureChartRef.value)
  pressureChart.setOption({
    tooltip: { trigger: 'axis', formatter: buildTooltipFormatter() },
    legend: { data: ['气压'], bottom: 0, textStyle: { color: '#8C8C8C' } },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#E8E8E3' } },
      axisLabel: {
        color: '#8C8C8C',
        fontSize: 11,
        formatter: (value: number) => formatAxisLabel(value),
      },
    },
    yAxis: {
      type: 'value',
      name: 'hPa',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#E8E8E3', type: 'dashed' } },
      axisLabel: {
        color: '#8C8C8C',
        formatter: (val: number) => val.toFixed(2),
      },
    },
    series: [
      {
        name: '气压',
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        data: pressureData.value,
        lineStyle: { color: '#D4A373', width: 2 },
        itemStyle: { color: '#D4A373' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(212,163,115,0.25)' },
            { offset: 1, color: 'rgba(212,163,115,0.02)' },
          ]) as any,
        },
      },
    ],
  })
}

// ==================== 图表更新（核心：time 轴 + 实时滚动） ====================
function updateCharts() {
  // 实时模式下，时间轴随当前时间滚动
  let min: number | undefined
  let max: number | undefined
  if (viewMode.value === 'realtime') {
    const now = Date.now()
    max = now
    min = now - currentRangeMs.value
  } else if (viewMode.value === 'custom' && customRangeBound.value) {
    min = customRangeBound.value.start
    max = customRangeBound.value.end
  }

  if (tempHumidChart) {
    tempHumidChart.setOption({
      xAxis: { min, max },
      series: [
        { data: aht20TempData.value },
        { data: bmp280TempData.value },
        { data: humidityData.value },
      ],
    })
  }
  if (pressureChart) {
    pressureChart.setOption({
      xAxis: { min, max },
      series: [{ data: pressureData.value }],
    })
  }
}

// ==================== 实时时间轴定时器（即使没数据也往后走） ====================
let realtimeTimer: number | null = null
function startRealtimeTimer() {
  realtimeTimer = window.setInterval(() => {
    if (viewMode.value === 'realtime') {
      updateCharts()
    }
  }, 5000)
}

// ==================== 生命周期 ====================
watch(data, (val) => {
  if (val) pushData(val)
})

function handleResize() {
  tempHumidChart?.resize()
  pressureChart?.resize()
}

onMounted(() => {
  nextTick(() => {
    initTempHumidChart()
    initPressureChart()
  })
  loadByRange('1h')
  startRealtimeTimer()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (realtimeTimer) clearInterval(realtimeTimer)
  tempHumidChart?.dispose()
  pressureChart?.dispose()
  tempHumidChart = null
  pressureChart = null
})
</script>

<template>
  <div class="page-container">
    <div class="monitor-header">
      <h2 class="page-title">动态监控</h2>
      <div class="header-actions">
        <el-radio-group v-model="timeRange" size="small" @change="handleRangeChange">
          <el-radio-button value="10m">10分钟</el-radio-button>
          <el-radio-button value="1h">1小时</el-radio-button>
          <el-radio-button value="6h">6小时</el-radio-button>
          <el-radio-button value="24h">24小时</el-radio-button>
        </el-radio-group>
        <el-date-picker
            v-model="customTimeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            size="small"
            value-format="x"
            @change="handleCustomRangeChange"
        />
        <el-tag v-if="isMock" type="warning" effect="plain" round>Mock 模式</el-tag>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <div class="mp-card chart-card">
          <h3 class="chart-title">温湿度实时监测</h3>
          <div ref="tempHumidChartRef" class="chart-container"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <div class="mp-card chart-card">
          <h3 class="chart-title">环境气压趋势</h3>
          <div ref="pressureChartRef" class="chart-container"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--mp-text-primary);
}

.chart-card {
  min-height: 400px;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--mp-text-primary);
  margin-bottom: 16px;
}

.chart-container {
  width: 100%;
  height: 340px;
}
</style>
