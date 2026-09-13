import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { DataProvider } from './contexts/DataContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { SignIn } from './pages/SignIn'
import { Dashboard } from './pages/Dashboard'
import { BikeDetail } from './pages/BikeDetail'
import { AddEditBike } from './pages/AddEditBike'
import { LogTask } from './pages/LogTask'
import { TaskTypes } from './pages/TaskTypes'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route path="/sign-in" element={<SignIn />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bikes/new"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AddEditBike />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bikes/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BikeDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bikes/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AddEditBike />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/log"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LogTask />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/task-types"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TaskTypes />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
