import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/database-config'
  },
  {
    path: '/database-config',
    name: 'DatabaseConfig',
    component: () => import('../views/DatabaseConfig.vue')
  },
  {
    path: '/excel-upload',
    name: 'ExcelUpload',
    component: () => import('../views/ExcelUpload.vue')
  },
  {
    path: '/column-mapping',
    name: 'ColumnMapping',
    component: () => import('../views/ColumnMapping.vue')
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;