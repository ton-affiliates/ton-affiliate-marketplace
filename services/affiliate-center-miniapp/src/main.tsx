import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { UserRoleProvider } from './UserRoleContext';

// this manifest is used temporarily for development purposes
const manifestUrl = 'https://01bb-2a0d-6fc0-1f6a-b700-cc42-93b8-fafc-46fa.ngrok-free.app/tonconnect-manifest.json';
//const manifestUrl = 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json';
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <TonConnectUIProvider manifestUrl={manifestUrl}>
    <UserRoleProvider>
    <App />
    </UserRoleProvider>
  </TonConnectUIProvider>,
)