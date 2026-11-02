import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { consumeInviteFromUrl } from './services/supabaseInvite';
import { installNativeClipboard } from './services/nativeClipboard';

// Pasang kredensial Supabase & Android native clipboard bridge
consumeInviteFromUrl();
installNativeClipboard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
