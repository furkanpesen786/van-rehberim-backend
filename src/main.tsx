import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { SavedItemsProvider } from './context/SavedItemsContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SavedItemsProvider>
        <App />
      </SavedItemsProvider>
    </AuthProvider>
  </StrictMode>,
);

