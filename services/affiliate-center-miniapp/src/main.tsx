import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { UserRoleProvider } from './UserRoleContext';

// Use a relative path for the manifest URL
// const manifestUrl = '/tonconnect-manifest.json';  // Correct path
const manifestUrl = 'https://01bb-2a0d-6fc0-1f6a-b700-cc42-93b8-fafc-46fa.ngrok-free.app/tonconnect-manifest.json';  // used locally because tonkeeper requires internet conenction


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <TonConnectUIProvider manifestUrl={manifestUrl}>
    <UserRoleProvider>
      <App />
    </UserRoleProvider>
  </TonConnectUIProvider>,
);
