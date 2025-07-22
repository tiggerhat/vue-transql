import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import router from './router';
// 导入全局状态，确保它在应用启动时被初始化
import './config/store';

const app = createApp(App);

app.use(Antd);
app.use(router);

app.mount('#app');
