import '@/lib/demoSeedBoot'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { EntriesProvider } from '@/contexts/EntriesContext'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EntriesProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: { background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155' },
            }}
          />
        </EntriesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
