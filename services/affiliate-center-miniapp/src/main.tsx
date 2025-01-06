import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { UserRoleProvider } from './UserRoleContext';

// Use a relative path for the manifest URL
// const manifestUrl = '/tonconnect-manifest.json';  // Correct path
const manifestUrl = 'http://localhost/tonconnect-manifest.json';


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <TonConnectUIProvider manifestUrl={manifestUrl}>
    <UserRoleProvider>
      <App />
    </UserRoleProvider>
  </TonConnectUIProvider>,
);
