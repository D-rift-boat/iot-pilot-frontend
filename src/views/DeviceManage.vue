<script setup lang="ts">
</script>

<template>
  <div class="page-container">
    <h2 class="page-title">设备管理</h2>
    <div class="mp-card placeholder-card">
      <el-icon :size="64" color="var(--mp-primary-light)"><Cpu /></el-icon>
      <h3>功能开发中</h3>
      <p>设备管理模块正在紧锣密鼓地开发中，敬请期待。</p>
      <el-button type="primary" round @click="$router.push('/')">
        返回首页
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--mp-text-primary);
  margin-bottom: 20px;
}

.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  text-align: center;
}

.placeholder-card h3 {
  font-size: 20px;
  color: var(--mp-text-primary);
}

.placeholder-card p {
  color: var(--mp-text-secondary);
  font-size: 14px;
}
</style>
