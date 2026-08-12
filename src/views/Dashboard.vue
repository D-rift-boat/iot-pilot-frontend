<script setup lang="ts">
import { computed } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'
import { getComfortLevel, getTrend } from '../utils/format'

const { data, isMock } = useWebSocket()

const deviceId = 'esp32-S3-001'
const isOnline = computed(() => data.value?.status === 'online')

const avgTemp = computed(() => {
  if (!data.value) return '--'
  return ((data.value.aht20Temp + data.value.bmp280Temp) / 2).toFixed(1)
})

const tempTrend = computed(() => {
  if (!data.value) return 'stable'
  return getTrend([data.value.aht20Temp, data.value.bmp280Temp])
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

const humidity = computed(() => data.value?.humidity ?? 0)
const comfortLevel = computed(() => getComfortLevel(humidity.value))
const pressure = computed(() => data.value?.pressure ?? 0)
const altitude = computed(() => data.value?.altitude ?? 0)
</script>

<template>
  <div class="page-container">
    <div class="dashboard-header">
      <h2 class="page-title">首页概览</h2>
      <el-tag v-if="isMock" type="warning" effect="plain" round>Mock 模式</el-tag>
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
            <el-icon :size="18" :style="{ color: trendColor, marginLeft: '8px' }">
              <component :is="trendIcon" />
            </el-icon>
          </div>
          <div class="data-sub">
            AHT20: {{ data?.aht20Temp?.toFixed(1) ?? '--' }}°C |
            BMP280: {{ data?.bmp280Temp?.toFixed(1) ?? '--' }}°C
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="mp-card data-card">
          <div class="card-label">实时湿度</div>
          <div class="data-value">
            <span class="big-num">{{ humidity.toFixed(1) }}</span>
            <span class="unit">%</span>
          </div>
          <div class="data-sub">
            舒适度：
            <el-tag
              :type="comfortLevel === '舒适' ? 'success' : 'warning'"
              effect="plain"
              round
              size="small"
            >
              {{ comfortLevel }}
            </el-tag>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <div class="mp-card data-card">
          <div class="card-label">环境气压 / 海拔</div>
          <div class="data-value">
            <span class="big-num">{{ pressure.toFixed(1) }}</span>
            <span class="unit">hPa</span>
          </div>
          <div class="data-sub">海拔约 {{ altitude.toFixed(0) }} m</div>
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
.dashboard-header {
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

.card-row {
  margin-bottom: 20px;
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
