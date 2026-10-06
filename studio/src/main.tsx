import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@slides/slides.css'
import './studio.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
