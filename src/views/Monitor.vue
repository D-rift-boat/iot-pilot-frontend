<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useWebSocket } from '../composables/useWebSocket'

const { data, isMock } = useWebSocket()

const tempHumidChartRef = ref<HTMLElement>()
const pressureChartRef = ref<HTMLElement>()
let tempHumidChart: echarts.ECharts | null = null
let pressureChart: echarts.ECharts | null = null

const MAX_POINTS = 20
const timeLabels = ref<string[]>([])
const aht20Temps = ref<number[]>([])
const bmp280Temps = ref<number[]>([])
const humidities = ref<number[]>([])
const pressures = ref<number[]>([])

function pushData(payload: NonNullable<typeof data.value>) {
  const time = new Date(payload.timestamp).toLocaleTimeString('zh-CN', { hour12: false })

  timeLabels.value.push(time)
  aht20Temps.value.push(payload.aht20Temp)
  bmp280Temps.value.push(payload.bmp280Temp)
  humidities.value.push(payload.humidity)
  pressures.value.push(payload.pressure)

  if (timeLabels.value.length > MAX_POINTS) {
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
      <el-tag v-if="isMock" type="warning" effect="plain" round>Mock 模式</el-tag>
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
