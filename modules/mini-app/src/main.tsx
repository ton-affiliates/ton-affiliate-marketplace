import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { UserRoleProvider } from './components/UserRoleContext';

// Use a relative path for the manifest URL
// const manifestUrl = '/tonconnect-manifest.json';  // Correct path
const manifestUrl = 'https://raw.githubusercontent.com/guyt-ds/RotNet/master/manifest.json';


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <TonConnectUIProvider manifestUrl={manifestUrl}>
    <UserRoleProvider>
      <App />
    </UserRoleProvider>
  </TonConnectUIProvider>,
);
