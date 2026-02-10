import { createRouter, createWebHistory } from 'vue-router'

const LoginView = () => import('@/views/auth/LoginView.vue')
const ForgotPasswordView = () => import('@/views/auth/ForgotPasswordView.vue')
const AppLayout = () => import('@/layouts/AppLayout.vue')
const DashboardView = () => import('@/views/dashboard/DashboardView.vue')
const EmployeesView = () => import('@/views/employees/EmployeesView.vue')
const EventsView = () => import('@/views/events/EventsView.vue')
const SwapRequestsView = () => import('@/views/swaps/SwapRequestsView.vue')
const VacationsView = () => import('@/views/vacations/VacationsView.vue')
const SettingsView = () => import('@/views/settings/SettingsView.vue')

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },

  // Guest routes
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPasswordView,
    meta: { requiresGuest: true },
  },

  // Authenticated routes
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
      },
      {
        path: 'employees',
        name: 'Employees',
        component: EmployeesView,
      },
      {
        path: 'events',
        name: 'Events',
        component: EventsView,
      },
      {
        path: 'swap-requests',
        name: 'SwapRequests',
        component: SwapRequestsView,
      },
      {
        path: 'vacations',
        name: 'Vacations',
        component: VacationsView,
      },
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsView,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('accessToken')

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next({ path: '/dashboard' })
  } else {
    next()
  }
})

export default router
