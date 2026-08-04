import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SucursalProvider } from './contexts/SucursalContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './pages/Login/LoginPage'
import { CheckinPage } from './pages/Checkin/CheckinPage'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { AlumnosPage } from './pages/alumnos/AlumnosPage'
import { AsistenciasPage } from './pages/asistencias/AsistenciasPage'
import { PagosPage } from './pages/pagos/PagosPage'
import { DisciplinasPage } from './pages/configuracion/Disciplinas'
import { ProfesoresPage } from './pages/configuracion/Profesores'
import { WhatsappConfigPage } from './pages/configuracion/WhatsappConfig'
import { ResumenProfesor } from './pages/resumenes/ResumenProfesor'
import { ResumenProfesores } from './pages/resumenes/ResumenProfesores'
import { ResumenTurnos } from './pages/resumenes/ResumenTurnos'
import { AsistenciaProfesores } from './pages/asistencia-profesores/AsistenciaProfesores'
import { AppLayout } from './components/layout/AppLayout'
import { StyleGuidePage } from './pages/StyleGuidePage'

function HomeRoute() {
  const { rol } = useAuth()

  if (rol === 'kiosco') return <CheckinPage />
  // "Asistencia Profesores" es la pantalla de Inicio del login profesor (doc 04,
  // sección 3 — migración 07). Admin sigue entrando al Dashboard, y accede a esta
  // misma pantalla como submenú "Profesores" dentro de Asistencia (/asistencias/profesores).
  if (rol === 'profesor') return <AsistenciaProfesores />

  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  )
}

function ResumenesRoute() {
  const { rol } = useAuth()

  // Admin ya no tiene una landing "General" propia — el primer submenú
  // (Profesores) hace de default dentro de Resúmenes.
  if (rol === 'admin') return <Navigate to="/resumenes/profesores" replace />
  return <ResumenProfesor />
}

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SucursalProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/alumnos" element={<AlumnosPage />} />
                <Route path="/asistencias" element={<AsistenciasPage />} />
                <Route path="/asistencias/profesores" element={<AsistenciaProfesores />} />
                <Route path="/pagos" element={<PagosPage />} />
                <Route path="/resumenes" element={<ResumenesRoute />} />
                <Route path="/resumenes/profesores" element={<ResumenProfesores />} />
                <Route path="/resumenes/turnos" element={<ResumenTurnos />} />
                <Route path="/configuracion/disciplinas" element={<DisciplinasPage />} />
                <Route path="/configuracion/profesores" element={<ProfesoresPage />} />
                <Route path="/configuracion/whatsapp" element={<WhatsappConfigPage />} />
              </Route>
              <Route path="/style-guide" element={<StyleGuidePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SucursalProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
