import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initNativeAuthListener } from './lib/nativeAuth'
import { cancelLegacyMedReminders } from './lib/medRemindersCleanup'

// Native eklenti kayıtlı değilse / köprü hata verirse bu, açılışı ASLA durdurmamalı.
try { initNativeAuthListener() } catch (e) { console.warn('[planmoy] native auth dinleyicisi baslatilamadi', e) }
// İlaç modülü kaldırıldı: eski sürümden kalan ilaç bildirimleri iptal edilir (H-06).
void cancelLegacyMedReminders()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
