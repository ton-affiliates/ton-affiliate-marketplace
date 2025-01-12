# Mini App Component

This is the **Mini App Component** of the Ton Affiliate Marketplace project. The Mini App is a front-end web application designed to interface with the TonConnect wallet and the backend services of the Ton Affiliate Marketplace.

## Features

- **Wallet Connection:** Allows users to connect their TonConnect-compatible wallets.
- **Campaign Setup:** Enables advertisers to set up Telegram-based campaigns by verifying group/channel details.
- **WebSocket Integration:** Receives real-time updates from the backend about campaign-related events.
- **API Proxying:** Proxies API requests through an Nginx server to ensure secure communication between the front-end and the backend.
- **Dynamic Configuration:** Uses environment variables to configure server connections and manifest file URLs.

## Technologies Used

- **React:** For building the UI.
- **TypeScript:** For strong typing and improved developer experience.
- **TonConnect UI:** For wallet integration.
- **WebSocket:** For real-time communication with the backend.
- **Nginx:** As a reverse proxy for API and WebSocket requests.
- **Docker:** For containerization and ease of deployment.

---

## Getting Started

### Prerequisites

1. **Node.js:** Ensure you have Node.js installed.
2. **Docker:** Ensure Docker is installed for containerization.
3. **Backend Server:** The backend services must be running and accessible.
4. **Nginx Configuration:** Ensure the Nginx server is properly configured to serve the app and proxy requests.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-repo>/ton-affiliate-marketplace.git
   cd ton-affiliate-marketplace/services/affiliate-center-miniapp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the environment variables:

   Create a `.env` file in the root of the `affiliate-center-miniapp` directory:

   ```env
   SERVER_NAME=localhost
   SERVER_PORT=80
   BACKEND_URL=http://web-server:3000
   TONCONNECT_MANIFEST_URL=https://yourdomain.com/tonconnect-manifest.json
   ```

4. Build the project:

   ```bash
   npm run build
   ```

### Running the App

#### Using Docker

1. Build and run the Docker containers:

   ```bash
   docker-compose up -d --build
   ```

2. Access the app in your browser:

   ```
   http://localhost:5173
   ```

#### Without Docker

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open the app in your browser:

   ```
   http://localhost:5173
   ```

---

## Deployment

To deploy the mini-app in a production environment:

1. Ensure the `build` directory is created:

   ```bash
   npm run build
   ```

2. Use Nginx to serve the app and proxy API requests. Example configuration:

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           root /usr/share/nginx/html;
           index index.html;
           try_files $uri /index.html;
       }

       location /api/ {
           proxy_pass http://web-server:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
       }

       location /ws/ {
           proxy_pass http://web-server:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Restart Nginx:

   ```bash
   sudo systemctl restart nginx
   ```

---

## Folder Structure

```
├── public
│   ├── assets
│   ├── tonconnect-manifest.json
├── src
│   ├── components
│   ├── hooks
│   ├── styles
│   ├── App.tsx
│   ├── index.tsx
├── .env
├── Dockerfile
├── nginx.conf
├── package.json
├── tsconfig.json
├── vite.config.ts
```

### Key Files

- **`src/components`:** Contains React components for UI functionality.
- **`Dockerfile`:** Docker configuration for containerizing the app.
- **`nginx.conf`:** Nginx configuration for serving the app and proxying requests.
- **`vite.config.ts`:** Vite configuration for building the app.

---

## Troubleshooting

### Common Issues

1. **WebSocket Not Connecting:**
   - Ensure the Nginx server is properly configured to proxy WebSocket requests.
   - Check the `location /ws/` configuration in `nginx.conf`.

2. **Manifest File Not Found:**
   - Verify the `TONCONNECT_MANIFEST_URL` in the `.env` file points to a valid, publicly accessible URL.

3. **CORS Errors:**
   - Ensure the Nginx configuration includes proper CORS headers for API and WebSocket requests.

---

## Contact

For any questions or support, please reach out to:

- **Email:** support@yourdomain.com
- **GitHub:** [Repository Link](https://github.com/your-repo)

