<script setup lang="ts">
import { computed } from 'vue'
import { useTopBarData } from '../composables/useTopBarData'
import { getComfortLevel, getTrend } from '../utils/format'

const {
  tempAht, tempBmp, humidity, pressure, altitude,
  deviceOnline, iotOnlineCount, userOnlineCount,
  updateTimeStr, latencyStr,
} = useTopBarData()

const deviceId = 'esp32-S3-001'
const isOnline = computed(() => deviceOnline.value)

/** 安全解析为数字，'--' 或无效值返回 NaN */
function toNum(val: string): number {
  if (val === '--' || val === '') return NaN
  return Number(val)
}

const tempAhtNum = computed(() => toNum(tempAht.value))
const tempBmpNum = computed(() => toNum(tempBmp.value))

const avgTemp = computed(() => {
  const a = tempAhtNum.value
  const b = tempBmpNum.value
  if (isNaN(a) && isNaN(b)) return '--'
  if (isNaN(a)) return b.toFixed(1)
  if (isNaN(b)) return a.toFixed(1)
  return ((a + b) / 2).toFixed(1)
})

const tempTrend = computed(() => {
  const arr = [tempAhtNum.value, tempBmpNum.value].filter(v => !isNaN(v))
  if (arr.length < 2) return 'stable'
  return getTrend(arr)
})

const trendIcon = computed(() => {
  if (tempTrend.value === 'up') return 'Top'
  if (tempTrend.value === 'down') return 'Bottom'
  return 'Minus'
})

const trendColor = computed(() => {
  if (tempTrend.value === 'up') return 'var(--mp-danger)'
  if (tempTrend.value === 'down') return 'var(--mp-secondary)'
  return 'var(--mp-success)'
})

const humidityNum = computed(() => toNum(humidity.value))
const comfortLevel = computed(() => {
  if (isNaN(humidityNum.value)) return '--'
  return getComfortLevel(humidityNum.value)
})

const pressureDisplay = computed(() => pressure.value === '--' ? '--' : pressure.value)
const altitudeDisplay = computed(() => altitude.value === '--' ? '--' : altitude.value)
</script>

<template>
  <div class="page-container">
    <div class="dashboard-header">
      <h2 class="page-title">首页概览</h2>
    </div>

    <el-row :gutter="20" class="card-row">
      <el-col :xs="24" :sm="12" :md="6">
        <div class="mp-card status-card">
          <div class="card-label">当前监控设备</div>
          <div class="device-id">{{ deviceId }}</div>
          <div class="status-row">
            <span class="status-dot" :class="isOnline ? 'online' : 'offline'"></span>
            <el-tag :type="isOnline ? 'success' : 'danger'" effect="plain" round size="small">
              {{ isOnline ? '在线' : '离线' }}
            </el-tag>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="mp-card data-card">
          <div class="card-label">实时温度</div>
          <div class="data-value">
            <span class="big-num">{{ avgTemp }}</span>
            <span class="unit">°C</span>
            <el-icon v-if="avgTemp !== '--'" :size="18" :style="{ color: trendColor, marginLeft: '8px' }">
              <component :is="trendIcon" />
            </el-icon>
          </div>
          <div class="data-sub">
            AHT20: {{ tempAht }}°C |
            BMP280: {{ tempBmp }}°C
          </div>
          <div class="data-sub update-time">更新：{{ updateTimeStr }}</div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="mp-card data-card">
          <div class="card-label">实时湿度</div>
          <div class="data-value">
            <span class="big-num">{{ humidity }}</span>
            <span class="unit">%</span>
          </div>
          <div class="data-sub">
            舒适度：
            <el-tag
              v-if="comfortLevel !== '--'"
              :type="comfortLevel === '舒适' ? 'success' : 'warning'"
              effect="plain"
              round
              size="small"
            >
              {{ comfortLevel }}
            </el-tag>
            <span v-else>--</span>
          </div>
          <div class="data-sub update-time">更新：{{ updateTimeStr }}</div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="mp-card data-card">
          <div class="card-label">环境气压 / 海拔</div>
          <div class="data-value">
            <span class="big-num">{{ pressureDisplay }}</span>
            <span class="unit">hPa</span>
          </div>
          <div class="data-sub">海拔约 {{ altitudeDisplay }} m</div>
          <div class="data-sub update-time">更新：{{ updateTimeStr }}</div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="mp-card data-card">
          <div class="card-label">在线设备数</div>
          <div class="data-value">
            <span class="big-num">{{ iotOnlineCount }}</span>
            <span class="unit">台</span>
          </div>
          <div class="data-sub">
            IoT设备 {{ iotOnlineCount }} 台 | 用户设备 {{ userOnlineCount }} 台
          </div>
          <div class="data-sub update-time">延迟：{{ latencyStr }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="card-row">
      <el-col :span="24">
        <div class="mp-card quick-actions">
          <h3 class="section-title">快捷操作</h3>
          <div class="action-grid">
            <div class="action-item" @click="$router.push('/monitor')">
              <el-icon :size="32" color="var(--mp-primary)"><Monitor /></el-icon>
              <span>实时监控</span>
            </div>
            <div class="action-item" @click="$router.push('/console')">
              <el-icon :size="32" color="var(--mp-secondary)"><Document /></el-icon>
              <span>查看日志</span>
            </div>
            <div class="action-item">
              <el-icon :size="32" color="var(--mp-warning)"><Setting /></el-icon>
              <span>设备配置</span>
            </div>
            <div class="action-item">
              <el-icon :size="32" color="var(--mp-success)"><DataAnalysis /></el-icon>
              <span>数据统计</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
  box-sizing: border-box;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--mp-text-primary);
}

.card-row {
  margin-bottom: 24px;
}

/* 卡片：同一列内垂直排列的卡片之间有足够的间距 */
:deep(.el-col) {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.mp-card {
  min-height: 160px;
  box-sizing: border-box;
  margin-bottom: 0;
}

.card-label {
  font-size: 13px;
  color: var(--mp-text-secondary);
  margin-bottom: 12px;
  font-weight: 500;
}

.device-id {
  font-size: 18px;
  font-weight: 600;
  color: var(--mp-text-primary);
  margin-bottom: 10px;
  font-family: 'JetBrains Mono', monospace;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--mp-success);
  box-shadow: 0 0 6px var(--mp-success);
}

.status-dot.offline {
  background: var(--mp-danger);
  box-shadow: 0 0 6px var(--mp-danger);
}

.data-value {
  display: flex;
  align-items: baseline;
}

.big-num {
  font-size: 32px;
  font-weight: 700;
  color: var(--mp-text-primary);
  line-height: 1;
}

.unit {
  font-size: 14px;
  color: var(--mp-text-secondary);
  margin-left: 4px;
}

.data-sub {
  font-size: 12px;
  color: var(--mp-text-secondary);
  margin-top: 10px;
}

.data-sub.update-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 6px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--mp-text-primary);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-radius: var(--mp-radius);
  background: var(--mp-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: var(--mp-text-secondary);
}

.action-item:hover {
  background: var(--mp-primary-light);
  color: #fff;
  transform: translateY(-2px);
}

.action-item:hover .el-icon {
  color: #fff !important;
}
</style>
