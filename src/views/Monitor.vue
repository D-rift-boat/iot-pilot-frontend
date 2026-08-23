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
const timeRange = ref('1h')

const timeLabels = ref<string[]>([])
const aht20Temps = ref<number[]>([])
const bmp280Temps = ref<number[]>([])
const humidities = ref<number[]>([])
const pressures = ref<number[]>([])

/** 加载历史数据 */
async function loadHistoryData(range: string = '1h') {
  const endTime = Date.now()
  const rangeMap: Record<string, number> = {
    '10m': 600_000,
    '1h': 3_600_000,
    '6h': 21_600_000,
    '24h': 86_400_000,
  }
  const startTime = endTime - (rangeMap[range] || 3_600_000)

  try {
    const res = await getDeviceHistory(DEVICE_ID, startTime, endTime)
    const historyPoints = res.data.data

    if (historyPoints && historyPoints.length > 0) {
      timeLabels.value = historyPoints.map(p =>
        new Date(p.reportTime).toLocaleTimeString('zh-CN', { hour12: false })
      )
      aht20Temps.value = historyPoints.map(p => p.temperatureAht)
      bmp280Temps.value = historyPoints.map(p => p.temperatureBmp)
      humidities.value = historyPoints.map(p => p.humidity)
      pressures.value = historyPoints.map(p => p.pressureHpa)
    } else {
      // 无历史数据，清空
      timeLabels.value = []
      aht20Temps.value = []
      bmp280Temps.value = []
      humidities.value = []
      pressures.value = []
    }
    updateCharts()
  } catch {
    // 接口不可用时保持空图表，等待WS实时数据填充
  }
}

/** 安全地把字符串传感器值转为 number，无效值返回 NaN */
function safeNum(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return NaN
  const n = Number(val)
  return isNaN(n) ? NaN : n
}

/** WS实时数据追加到图表 */
function pushData(msg: NonNullable<typeof data.value>) {
// 格式化时间（毫秒时间戳 → HH:mm:ss）
//   const time = dayjs(Number(msg.timestamp)).format('HH:mm:ss')
  // 完整日期时间
  const time = dayjs(Number(msg.timestamp)).format('YYYY-MM-DD HH:mm:ss')
  const tAht = safeNum(msg.data.tempAht)
  const tBmp = safeNum(msg.data.tempBmp)
  const h = safeNum(msg.data.humidity)
  const p = safeNum(msg.data.pressureHpa)

  // 只有在至少有一个有效数值时才推入（避免全NaN污染图表）
  if (isNaN(tAht) && isNaN(tBmp) && isNaN(h) && isNaN(p)) return

  timeLabels.value.push(time)
  aht20Temps.value.push(tAht)
  bmp280Temps.value.push(tBmp)
  humidities.value.push(h)
  pressures.value.push(p)

  // 保留最近MAX_POINTS个点
  while (timeLabels.value.length > MAX_POINTS) {
    timeLabels.value.shift()
    aht20Temps.value.shift()
    bmp280Temps.value.shift()
    humidities.value.shift()
    pressures.value.shift()
  }

  updateCharts()
}

function initTempHumidChart() {
  if (!tempHumidChartRef.value) return
  tempHumidChart = echarts.init(tempHumidChartRef.value)
  tempHumidChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['AHT20 温度', 'BMP280 温度', '湿度'], bottom: 0, textStyle: { color: '#8C8C8C' } },
    grid: { top: 20, right: 60, bottom: 40, left: 50 },
    xAxis: {
      type: 'category',
      data: timeLabels.value,
      axisLine: { lineStyle: { color: '#E8E8E3' } },
      axisLabel: { color: '#8C8C8C', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '°C',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#E8E8E3', type: 'dashed' } },
        axisLabel: { color: '#8C8C8C' },
      },
      {
        type: 'value',
        name: '%',
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#8C8C8C' },
      },
    ],
    series: [
      {
        name: 'AHT20 温度',
        type: 'line',
        smooth: true,
        data: aht20Temps.value,
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
        data: bmp280Temps.value,
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
        yAxisIndex: 1,
        data: humidities.value,
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
    tooltip: { trigger: 'axis' },
    legend: { data: ['气压'], bottom: 0, textStyle: { color: '#8C8C8C' } },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: {
      type: 'category',
      data: timeLabels.value,
      axisLine: { lineStyle: { color: '#E8E8E3' } },
      axisLabel: { color: '#8C8C8C', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'hPa',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#E8E8E3', type: 'dashed' } },
      axisLabel: { color: '#8C8C8C' },
    },
    series: [
      {
        name: '气压',
        type: 'line',
        smooth: true,
        data: pressures.value,
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

function updateCharts() {
  if (tempHumidChart) {
    tempHumidChart.setOption({
      xAxis: { data: timeLabels.value },
      series: [
        { data: aht20Temps.value },
        { data: bmp280Temps.value },
        { data: humidities.value },
      ],
    })
  }
  if (pressureChart) {
    pressureChart.setOption({
      xAxis: { data: timeLabels.value },
      series: [{ data: pressures.value }],
    })
  }
}

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
  loadHistoryData('1h')
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
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
        <el-radio-group v-model="timeRange" size="small" @change="loadHistoryData(timeRange)">
          <el-radio-button value="10m">10分钟</el-radio-button>
          <el-radio-button value="1h">1小时</el-radio-button>
          <el-radio-button value="6h">6小时</el-radio-button>
          <el-radio-button value="24h">24小时</el-radio-button>
        </el-radio-group>
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
