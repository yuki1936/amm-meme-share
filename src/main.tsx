import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const savedTheme = localStorage.getItem('meme-share-theme');
document.documentElement.classList.toggle('dark', savedTheme !== 'light');
document.documentElement.style.colorScheme = savedTheme === 'light' ? 'light' : 'dark';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
