import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminProvider } from './context/AdminContext.tsx'

createRoot(document.getElementById('root')!).render(
  <AdminProvider>
  {/* <StrictMode> */}
    <App />
    </AdminProvider>,
)
