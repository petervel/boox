import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { guest: true } },
  { path: '/register', component: () => import('../views/RegisterView.vue'), meta: { guest: true } },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/search' },
      { path: 'search', component: () => import('../views/SearchView.vue') },
      { path: 'favorites', component: () => import('../views/FavoritesView.vue') },
      { path: 'reading-list', component: () => import('../views/ReadingListView.vue') },
      { path: 'discover', component: () => import('../views/DiscoverView.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login';
  if (to.meta.guest && auth.isAuthenticated) return '/search';
});

export default router;
