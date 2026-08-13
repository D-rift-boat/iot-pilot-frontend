<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDeviceList, sendDeviceCommand } from '../api/device'
import { formatDeviceStatus, formatSensorStatus, formatFullTime } from '../utils/format'
import type { DeviceListItem, DeviceCommand } from '../api/types/device'
import { ElMessage, ElMessageBox } from 'element-plus'

const deviceList = ref<DeviceListItem[]>([])
const loading = ref(false)
const cmdDialogVisible = ref(false)
const selectedDeviceId = ref('')

const cmdForm = ref<DeviceCommand>({
  cmdCode: 'device_restart',
  params: {},
})

const cmdOptions = [
  { value: 'device_restart', label: '设备重启', desc: '远程重启ESP32设备' },
  { value: 'sensor_calibrate', label: '传感器校准', desc: '校准AHT20/BMP280传感器' },
  { value: 'light_switch', label: '灯光开关', desc: '控制外接灯光开关' },
]

async function fetchDevices() {
  loading.value = true
  try {
    const res = await getDeviceList()
    deviceList.value = res.data.data ?? []
  } catch {
    ElMessage.warning('获取设备列表失败，请检查后端服务')
    deviceList.value = []
  } finally {
    loading.value = false
  }
}

function openCmdDialog(deviceId: string) {
  selectedDeviceId.value = deviceId
  cmdForm.value = { cmdCode: 'device_restart', params: {} }
  cmdDialogVisible.value = true
}

async function handleSendCommand() {
  if (!selectedDeviceId.value) return

  try {
    await ElMessageBox.confirm(
      `确认向设备 ${selectedDeviceId.value} 下发指令【${cmdOptions.find(o => o.value === cmdForm.value.cmdCode)?.label}】？`,
      '指令确认',
      { confirmButtonText: '确认下发', cancelButtonText: '取消', type: 'warning' }
    )
    await sendDeviceCommand(selectedDeviceId.value, cmdForm.value)
    ElMessage.success('指令已下发')
    cmdDialogVisible.value = false
  } catch {
    // 用户取消或请求失败
  }
}

function handleRefresh() {
  fetchDevices()
  ElMessage.success('设备列表已刷新')
}

onMounted(fetchDevices)
</script>

<template>
  <div class="page-container">
    <div class="device-header">
      <h2 class="page-title">设备管理</h2>
      <el-button type="primary" size="small" @click="handleRefresh">
        <el-icon><Refresh /></el-icon>刷新列表
      </el-button>
    </div>

    <!-- 设备列表 -->
    <div class="mp-card">
      <el-table
        :data="deviceList"
        v-loading="loading"
        stripe
        style="width: 100%"
        empty-text="暂无设备数据"
      >
        <el-table-column prop="deviceId" label="设备ID" min-width="160">
          <template #default="{ row }">
            <span class="device-id-cell">{{ row.deviceId }}</span>
          </template>
        </el-table-column>

        <el-table-column label="设备状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="formatDeviceStatus(row.deviceStatus).type"
              effect="plain"
              round
              size="small"
            >
              {{ formatDeviceStatus(row.deviceStatus).text }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="温度(AHT20)" width="120" align="center">
          <template #default="{ row }">
            {{ row.tempAht?.toFixed(1) ?? '--' }}°C
          </template>
        </el-table-column>

        <el-table-column label="湿度" width="100" align="center">
          <template #default="{ row }">
            {{ row.humidity?.toFixed(1) ?? '--' }}%
          </template>
        </el-table-column>

        <el-table-column label="气压" width="110" align="center">
          <template #default="{ row }">
            {{ row.pressureHpa?.toFixed(1) ?? '--' }} hPa
          </template>
        </el-table-column>

        <el-table-column label="海拔" width="100" align="center">
          <template #default="{ row }">
            {{ row.altitude?.toFixed(0) ?? '--' }} m
          </template>
        </el-table-column>

        <el-table-column label="AHT20" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="formatSensorStatus(row.aht20Status).type"
              size="small"
              effect="plain"
              round
            >
              {{ formatSensorStatus(row.aht20Status).text }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="BMP280" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="formatSensorStatus(row.bmp280Status).type"
              size="small"
              effect="plain"
              round
            >
              {{ formatSensorStatus(row.bmp280Status).text }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="最后上报" width="180" align="center">
          <template #default="{ row }">
            <span class="time-cell">{{ formatFullTime(row.timestamp) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="openCmdDialog(row.deviceId)"
            >
              下发指令
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 指令下发弹窗 -->
    <el-dialog
      v-model="cmdDialogVisible"
      title="下发设备指令"
      width="460px"
      :close-on-click-modal="false"
    >
      <div class="cmd-dialog-body">
        <p class="cmd-target">
          目标设备：<span class="cmd-device-id">{{ selectedDeviceId }}</span>
        </p>

        <el-form label-width="80px" style="margin-top: 16px">
          <el-form-item label="指令类型">
            <el-radio-group v-model="cmdForm.cmdCode">
              <el-radio
                v-for="opt in cmdOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="指令说明">
            <span class="cmd-desc">
              {{ cmdOptions.find(o => o.value === cmdForm.cmdCode)?.desc }}
            </span>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="cmdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSendCommand">确认下发</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.device-header {
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

.device-id-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
}

.time-cell {
  font-size: 12px;
  color: var(--mp-text-secondary);
}

.cmd-dialog-body {
  padding: 0 4px;
}

.cmd-target {
  font-size: 14px;
  color: var(--mp-text-secondary);
}

.cmd-device-id {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--mp-primary);
}

.cmd-desc {
  font-size: 13px;
  color: var(--mp-text-secondary);
}
</style>
