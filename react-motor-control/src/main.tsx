import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { MotorProvider } from './contexts/MotorContext'
import { UIProvider } from './contexts/UIContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotorProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </MotorProvider>
  </React.StrictMode>,
)
