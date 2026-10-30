import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initNativeAuthListener } from './lib/nativeAuth'

// Native eklenti kayıtlı değilse / köprü hata verirse bu, açılışı ASLA durdurmamalı.
try { initNativeAuthListener() } catch (e) { console.warn('[planmoy] native auth dinleyicisi baslatilamadi', e) }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
