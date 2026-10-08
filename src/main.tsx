import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { consumeInviteFromUrl } from './services/supabaseInvite';

// Pasang kredensial Supabase dari link undangan (jika ada) sebelum App membaca state
consumeInviteFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
