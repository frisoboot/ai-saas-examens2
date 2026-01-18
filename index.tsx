import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { NotificationProvider } from './contexts/NotificationContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
    <SpeedInsights />
    <Analytics />
  </React.StrictMode>
);
