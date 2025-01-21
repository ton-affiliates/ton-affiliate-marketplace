import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { UserRoleProvider } from './components/UserRoleContext';


const manifestUrl = import.meta.env.VITE_TON_CONNECT_PATH;
console.log("Manifest url: " + manifestUrl);


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <TonConnectUIProvider manifestUrl={manifestUrl}>
    <UserRoleProvider>
      <App />
    </UserRoleProvider>
  </TonConnectUIProvider>,
);
