// src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTelegramContext } from './TelegramContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { userInfo, loading } = useTelegramContext();
  const isLoggedIn = userInfo !== null;
  const location = useLocation();

  // If we're still loading user info from local storage or an API, don’t decide yet
  if (loading) {
    return <div>Loading...</div>;
  }

  // If not logged in, redirect to "/login" and store the current location in state
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in, render the protected route content
  return <>{children}</>;
}
