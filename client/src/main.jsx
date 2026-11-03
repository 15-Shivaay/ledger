import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { LanguageProvider } from './context/LanguageContext';
import App from './App';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey && process.env.NODE_ENV !== 'test') {
  console.warn(
    'Missing VITE_CLERK_PUBLISHABLE_KEY in client/.env. Please configure it to enable Clerk authentication.'
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {clerkPubKey ? (
      <ClerkProvider publishableKey={clerkPubKey}>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ClerkProvider>
    ) : (
      <LanguageProvider>
        {/* If publishable key is not yet set in environment, render app with warning banner */}
        <div className="bg-amber-500 text-slate-950 text-xs px-4 py-2 font-semibold text-center sticky top-0 z-50">
          ⚠️ Clerk Publishable Key missing. Set VITE_CLERK_PUBLISHABLE_KEY in client/.env (see .env.example)
        </div>
        <App />
      </LanguageProvider>
    )}
  </React.StrictMode>
);

