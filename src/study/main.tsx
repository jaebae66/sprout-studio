import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Fonts are bundled, so the app looks the same offline.
import '@fontsource/mali/latin-500.css';
import '@fontsource/mali/latin-600.css';
import '@fontsource/mali/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '../shared/styles/theme.css';
import '../shared/styles/base.css';
import './study.css';
import '../bindery/bindery.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
