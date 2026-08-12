import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { title: '首页概览' },
    },
    {
      path: '/monitor',
      name: 'Monitor',
      component: () => import('../views/Monitor.vue'),
      meta: { title: '动态监控' },
    },
    {
      path: '/console',
      name: 'Console',
      component: () => import('../views/Console.vue'),
      meta: { title: '日志控制台' },
    },
    {
      path: '/device',
      name: 'DeviceManage',
      component: () => import('../views/DeviceManage.vue'),
      meta: { title: '设备管理' },
    },
  ],
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || 'Home'} - Home Pilot`
})

export default router
