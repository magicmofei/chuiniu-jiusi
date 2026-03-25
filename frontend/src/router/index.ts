import { createRouter, createWebHistory } from 'vue-router';
import Lobby from '../views/Lobby.vue';
import Table from '../views/Table.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'lobby', component: Lobby },
    { path: '/table', name: 'table', component: Table },
  ],
});

export default router;
