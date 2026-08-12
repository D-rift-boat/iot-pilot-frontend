# 🏠 Home-Pilot IoT 管理系统 — 设计文档

## 一、项目概述

| 项 | 内容 |
|---|---|
| **项目名称** | home-pilot |
| **定位** | 物联网（IoT）设备监控与管理前端系统 |
| **技术栈** | Vue 3 (`<script setup>`) + Vue Router 4 + Element Plus + ECharts 5 + TypeScript |
| **构建工具** | Vite 8 |
| **后端地址** | `http://localhost:8080`（WebSocket: `ws://localhost:8080/ws/device`） |
| **视觉风格** | 莫兰迪（Morandi）高级灰调，低饱和度绿/蓝灰主色，圆角卡片 + 微阴影 |

---

## 二、目录结构

```
src/
├── api/                        # API 接口层（企业级分层）
│   ├── index.ts                # Axios 实例 & 拦截器
│   ├── types/
│   │   └── device.ts           # 设备相关类型
│   └── device.ts               # 设备相关 API
│
├── assets/
│   └── styles/
│       ├── variables.css       # CSS 变量（莫兰迪色板）
│       └── global.css          # 全局样式重置 & 通用类
│
├── composables/                # 组合式函数
│   └── useWebSocket.ts         # WebSocket 连接 & Mock 降级
│
├── router/
│   └── index.ts                # 路由配置
│
├── utils/
│   ├── format.ts               # 格式化工具
│   └── mock.ts                 # Mock 数据生成器
│
├── views/
│   ├── Dashboard.vue           # 首页概览
│   ├── Monitor.vue             # 动态监控
│   ├── Console.vue             # 日志控制台
│   └── DeviceManage.vue        # 设备管理（占位）
│
├── App.vue                     # 根组件（含 Layout）
└── main.ts                     # 入口文件
```

---

## 三、莫兰迪配色方案

| 变量名 | 色值 | 用途 |
|---|---|---|
| `--mp-primary` | `#7BA39E` | 莫兰迪绿，主色 |
| `--mp-primary-light` | `#A3C4BF` | 浅主色 |
| `--mp-primary-dark` | `#5B8A84` | 深主色 |
| `--mp-secondary` | `#8E9AAF` | 蓝灰辅助色 |
| `--mp-bg` | `#F5F5F0` | 页面背景 |
| `--mp-card-bg` | `#FFFFFF` | 卡片背景 |
| `--mp-text-primary` | `#4A4A4A` | 主文字 |
| `--mp-text-secondary` | `#8C8C8C` | 次文字 |
| `--mp-border` | `#E8E8E3` | 边框色 |
| `--mp-success` | `#A3B18A` | 成功/在线 |
| `--mp-warning` | `#D4A373` | 警告 |
| `--mp-danger` | `#C17B7B` | 危险/离线 |
| `--mp-shadow` | `0 2px 12px rgba(0,0,0,0.06)` | 卡片阴影 |
| `--mp-radius` | `12px` | 统一圆角 |

---

## 四、路由设计

| 路径 | 组件 | 说明 |
|---|---|---|
| `/` | `Dashboard.vue` | 首页概览（默认页） |
| `/monitor` | `Monitor.vue` | 动态监控（ECharts 实时图表） |
| `/console` | `Console.vue` | 日志控制台 |
| `/device` | `DeviceManage.vue` | 设备管理（占位页） |

---

## 五、核心模块设计

### 5.1 WebSocket & Mock 降级

- 尝试连接 `ws://localhost:8080/ws/device?deviceId=esp32-S3-001`
- 连接成功 → 接收实时数据
- 连接失败/5s超时 → 启动 Mock（5秒定时器生成随机数据）
- 组件卸载 → 清理 ws + timer

### 5.2 首页概览（Dashboard）

- 卡片1：监控设备 ID + 在线/离线状态
- 卡片2：实时温度（AHT20+BMP280 平均值 + 趋势）
- 卡片3：实时湿度 + 舒适度评级
- 卡片4：气压/海拔
- 快捷操作入口

### 5.3 动态监控（Monitor）

- 温度双曲线（AHT20 vs BMP280）
- 湿度+气压双Y轴图
- 保留最近20个点，左移

### 5.4 日志控制台（Console）

- 实时日志流
- 按级别筛选
- 清空日志
- 自动滚动到底部

---

## 六、API 接口规范（预留）

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/v1/device/:id/status` | 获取设备当前状态 |
| `GET` | `/api/v1/device/:id/history` | 获取历史数据 |
| `GET` | `/api/v1/device/list` | 获取设备列表 |
| `POST` | `/api/v1/device/:id/command` | 下发设备指令 |
| `GET` | `/api/v1/log/list` | 查询日志 |
| `POST` | `/api/v1/auth/login` | 用户登录 |
| `POST` | `/api/v1/auth/logout` | 用户退出 |

**统一响应格式：**
```typescript
interface ApiResponse<T> {
  code: number       // 0=成功
  message: string
  data: T
  timestamp: number
}
```

---

## 七、数据结构

```typescript
interface DevicePayload {
  deviceId: string
  timestamp: number
  aht20Temp: number
  bmp280Temp: number
  humidity: number
  pressure: number
  altitude: number
  status: 'online' | 'offline'
}
```

---

## 八、资源清理策略

| 资源 | 创建时机 | 清理时机 |
|---|---|---|
| WebSocket | onMounted | onUnmounted → ws.close() |
| Mock Timer | WS连接失败 | onUnmounted → clearInterval() |
| ECharts | onMounted | onUnmounted → chart.dispose() |
