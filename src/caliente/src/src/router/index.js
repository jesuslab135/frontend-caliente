import { createRouter, createWebHistory } from 'vue-router'

const LoginView = () => import('@/views/auth/LoginView.vue')
const ForgotPasswordView = () => import('@/views/auth/ForgotPasswordView.vue')
const AppLayout = () => import('@/layouts/AppLayout.vue')
const DashboardView = () => import('@/views/dashboard/DashboardView.vue')
const EmployeesView = () => import('@/views/employees/EmployeesView.vue')
const EventsView = () => import('@/views/events/EventsView.vue')
const LeaguesView = () => import('@/views/leagues/LeaguesView.vue')
const SwapRequestsView = () => import('@/views/swaps/SwapRequestsView.vue')
const VacationsView = () => import('@/views/vacations/VacationsView.vue')
const SportCalendarView = () => import('@/views/calendar/SportCalendarView.vue')
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
        meta: { requiresAdmin: true }, // Añadido para RBAC
      },
      {
        path: 'events',
        name: 'Events',
        component: EventsView,
      },
      {
        path: 'leagues',
        name: 'Leagues',
        component: LeaguesView,
      },
      {
        path: 'sport-calendar',
        name: 'SportCalendar',
        component: SportCalendarView,
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
        meta: { requiresAdmin: true }, // Añadido para RBAC
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
  // Añadido para RBAC — Guard de ruta para vistas exclusivas de Admin
  } else if (to.meta.requiresAdmin) {
    try {
      const userRaw = localStorage.getItem('user')
      const user = userRaw ? JSON.parse(userRaw) : null
      const role = user?.role || user?._role
      if (role !== 'ADMIN') {
        next({ path: '/dashboard' })
        return
      }
    } catch {
      next({ path: '/dashboard' })
      return
    }
    next()
  } else {
    next()
  }
})

export default router
