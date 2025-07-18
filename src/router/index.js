import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/excel-upload',
    name: 'ExcelUpload',
    component: () => import('../views/ExcelUpload.vue')
  },
  {
    path: '/database-config',
    name: 'DatabaseConfig',
    component: () => import('../views/DatabaseConfig.vue')
  },
  {
    path: '/column-mapping',
    name: 'ColumnMapping',
    component: () => import('../views/ColumnMapping.vue')
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

export default router;