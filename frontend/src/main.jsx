import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Skip ngrok browser warning on all API calls
const _fetch = window.fetch;
window.fetch = (url, opts = {}) => {
  opts.headers = { ...(opts.headers || {}), 'ngrok-skip-browser-warning': 'true' };
  return _fetch(url, opts);
};
