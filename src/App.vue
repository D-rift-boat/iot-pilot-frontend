<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { useWebSocket } from './composables/useWebSocket'

const router = useRouter()
const route = useRoute()

const { data: realtimeData, connectionState, onlineCount } = useWebSocket()

const activeMenu = computed(() => route.path)

const connectionLabel = computed(() => {
  switch (connectionState.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'reconnecting': return '重连中...'
    default: return '未连接'
  }
})

const menuItems = [
  { path: '/', title: '首页概览', icon: 'Odometer' },
  { path: '/monitor', title: '动态监控', icon: 'Monitor' },
  { path: '/console', title: '日志控制台', icon: 'Document' },
  { path: '/device', title: '设备管理', icon: 'Cpu' },
]

function handleMenuSelect(path: string) {
  router.push(path)
}

function handleAlarm() {
  ElMessage.info('告警中心功能开发中')
}

function handleUserCommand(cmd: string) {
  if (cmd === 'login') {
    ElMessageBox.prompt('请输入登录令牌', '账号登录', {
      confirmButtonText: '登录',
      cancelButtonText: '取消',
    }).then(({ value }) => {
      if (value) {
        localStorage.setItem('mp_token', value)
        ElMessage.success('登录成功')
      }
    }).catch(() => {})
  } else if (cmd === 'logout') {
    localStorage.removeItem('mp_token')
    ElMessage.success('已退出登录')
  }
}
</script>

<template>
  <el-container class="app-layout">
    <el-header class="app-header">
      <div class="header-left">
        <div class="logo" @click="router.push('/')">
          <el-icon :size="28" color="var(--mp-primary)"><Cpu /></el-icon>
          <span class="logo-text">home-pilot</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          class="header-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item
            v-for="item in menuItems"
            :key="item.path"
            :index="item.path"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </el-menu>
      </div>
      <div class="header-right">
        <el-badge :value="3" :max="99" class="alarm-badge">
          <el-button :icon="Bell" circle @click="handleAlarm" />
        </el-badge>
        <el-dropdown @command="handleUserCommand">
          <div class="user-avatar">
            <el-avatar :size="36" class="avatar-img">
              <el-icon :size="20"><User /></el-icon>
            </el-avatar>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="login">
                <el-icon><Login /></el-icon>账号登录
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 实时数据横条 -->
    <div class="realtime-bar">
      <div class="realtime-item">
        <span class="realtime-label">温度</span>
        <span class="realtime-value">{{ realtimeData?.data.tempAht?.toFixed(1) ?? '--' }}°C</span>
      </div>
      <div class="realtime-item">
        <span class="realtime-label">湿度</span>
        <span class="realtime-value">{{ realtimeData?.data.humidity?.toFixed(1) ?? '--' }}%</span>
      </div>
      <div class="realtime-item">
        <span class="realtime-label">气压</span>
        <span class="realtime-value">{{ realtimeData?.data.pressureHpa?.toFixed(1) ?? '--' }} hPa</span>
      </div>
      <div class="realtime-item">
        <span class="realtime-label">海拔</span>
        <span class="realtime-value">{{ realtimeData?.data.altitude?.toFixed(0) ?? '--' }} m</span>
      </div>
      <div class="realtime-item">
        <span class="realtime-label">在线设备</span>
        <span class="realtime-value highlight">{{ onlineCount }} 台</span>
      </div>
      <div class="realtime-item">
        <span class="status-dot" :class="connectionState === 'connected' ? 'online' : 'offline'"></span>
        <span class="realtime-label">{{ connectionLabel }}</span>
      </div>
    </div>

    <el-main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </el-container>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--mp-bg);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--mp-card-bg);
  border-bottom: 1px solid var(--mp-border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  padding: 0 24px;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--mp-primary);
  letter-spacing: -0.5px;
}

.header-menu {
  border-bottom: none !important;
  background: transparent;
}

.header-menu .el-menu-item {
  font-size: 14px;
  font-weight: 500;
  color: var(--mp-text-secondary);
  border-color: var(--mp-primary) !important;
}

.header-menu .el-menu-item.is-active {
  color: var(--mp-primary) !important;
  background-color: transparent !important;
}

.header-menu .el-menu-item:hover {
  color: var(--mp-primary) !important;
  background-color: transparent !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.alarm-badge :deep(.el-badge__content) {
  background-color: var(--mp-danger);
}

.user-avatar {
  cursor: pointer;
}

.avatar-img {
  background: var(--mp-primary-light);
  color: #fff;
}

.app-main {
  padding: 0;
}

/* 实时数据横条 */
.realtime-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 24px;
  background: linear-gradient(90deg, var(--mp-primary-dark), var(--mp-primary));
  color: #fff;
  font-size: 13px;
  overflow-x: auto;
}

.realtime-item {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.realtime-label {
  opacity: 0.85;
}

.realtime-value {
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.realtime-value.highlight {
  color: #FFE4A0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #A3B18A;
  box-shadow: 0 0 6px #A3B18A;
}

.status-dot.offline {
  background: #C17B7B;
  box-shadow: 0 0 6px #C17B7B;
}
</style>
