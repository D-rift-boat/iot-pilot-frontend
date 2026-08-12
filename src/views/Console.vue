<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'
import { formatTime } from '../utils/format'

const { logs, clearLogs } = useWebSocket()

const filterLevel = ref<string>('ALL')
const logContainerRef = ref<HTMLElement>()

const filteredLogs = computed(() => {
  if (filterLevel.value === 'ALL') return logs.value
  return logs.value.filter((l) => l.level === filterLevel.value)
})

const levelTagType = (level: string): '' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (level) {
    case 'INFO': return 'success'
    case 'WARN': return 'warning'
    case 'ERROR': return 'danger'
    default: return 'info'
  }
}

watch(
  () => filteredLogs.value.length,
  () => {
    nextTick(() => {
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
      }
    })
  }
)
</script>

<template>
  <div class="page-container">
    <div class="console-header">
      <h2 class="page-title">日志控制台</h2>
      <div class="console-actions">
        <el-radio-group v-model="filterLevel" size="small">
          <el-radio-button value="ALL">全部</el-radio-button>
          <el-radio-button value="INFO">INFO</el-radio-button>
          <el-radio-button value="WARN">WARN</el-radio-button>
          <el-radio-button value="ERROR">ERROR</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="clearLogs">
          <el-icon><Delete /></el-icon>清空日志
        </el-button>
      </div>
    </div>

    <div class="mp-card log-card">
      <div ref="logContainerRef" class="log-container">
        <div v-if="filteredLogs.length === 0" class="log-empty">
          <el-icon :size="48" color="var(--mp-border)"><Document /></el-icon>
          <p>暂无日志数据</p>
        </div>
        <div
          v-for="(log, index) in filteredLogs"
          :key="log.timestamp + log.message + index"
          class="log-line"
        >
          <span class="log-time">[{{ formatTime(log.timestamp) }}]</span>
          <el-tag :type="levelTagType(log.level)" size="small" effect="plain" round class="log-level">
            {{ log.level }}
          </el-tag>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--mp-text-primary);
}

.console-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.log-card {
  padding: 0;
  overflow: hidden;
}

.log-container {
  height: calc(100vh - 220px);
  overflow-y: auto;
  padding: 16px 20px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.8;
}

.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-thumb {
  background: var(--mp-border);
  border-radius: 3px;
}

.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--mp-text-secondary);
  gap: 12px;
}

.log-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  border-bottom: 1px solid var(--mp-border);
}

.log-line:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--mp-text-secondary);
  white-space: nowrap;
}

.log-level {
  flex-shrink: 0;
}

.log-message {
  color: var(--mp-text-primary);
}
</style>
