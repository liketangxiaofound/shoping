import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index'
import 'element-plus/dist/index.css' 
import ElementPlus from 'element-plus';
import {createPinia} from 'pinia'

const app=createApp(App)
const pinia=createPinia()
app.use(router)
app.use(ElementPlus)
app.use(pinia)
app.mount('#app')
