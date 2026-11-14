import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CustomerLayout, OwnerLayout, RequireRole } from './components/Layouts'
import { PageSkeleton } from './components/ui'
import Landing from './pages/public/Landing'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/public/Auth'
import NotFound from './pages/public/NotFound'

const SurplusPublic = lazy(() => import('./pages/public/SurplusPublic'))
const Dashboard = lazy(() => import('./pages/owner/Dashboard'))
const InputPage = lazy(() => import('./pages/owner/InputPage'))
const WastePage = lazy(() => import('./pages/owner/WastePage'))
const ForecastPage = lazy(() => import('./pages/owner/ForecastPage'))
const SurplusManage = lazy(() => import('./pages/owner/SurplusManage'))
const SurplusNew = lazy(() => import('./pages/owner/SurplusNew'))
const OwnerOrders = lazy(() => import('./pages/owner/OwnerOrders'))
const Settings = lazy(() => import('./pages/owner/Settings'))
const MyOrders = lazy(() => import('./pages/customer/MyOrders'))
const Nutrition = lazy(() => import('./pages/customer/Nutrition'))
const ProfilePage = lazy(() => import('./pages/customer/ProfilePage'))
const CustomerHome = lazy(() => import('./pages/customer/Home'))
const Onboarding = lazy(() => import('./pages/customer/Onboarding'))

export default function App() {
  const location = useLocation()
  return (
    // key: error di satu halaman tidak 'menempel' saat pindah halaman
    <ErrorBoundary key={location.pathname}>
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl p-5">
          <PageSkeleton />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Halaman publik + customer */}
        <Route element={<CustomerLayout />}>
          <Route path="/surplus" element={<SurplusPublic />} />
          <Route element={<RequireRole role="customer" />}>
            <Route path="/home" element={<CustomerHome />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Pertanyaan tujuan diet customer (layar penuh) */}
        <Route element={<RequireRole role="customer" />}>
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        {/* Halaman admin restoran (owner) */}
        <Route element={<RequireRole role="owner" />}>
          <Route element={<OwnerLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/input" element={<InputPage />} />
            <Route path="/waste" element={<WastePage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/surplus/manage" element={<SurplusManage />} />
            <Route path="/surplus/new" element={<SurplusNew />} />
            <Route path="/orders" element={<OwnerOrders />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
