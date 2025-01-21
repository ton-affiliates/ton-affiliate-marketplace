// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTelegramContext } from './TelegramContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { userInfo, loading } = useTelegramContext(); 
  const isLoggedIn = userInfo !== null;

  // If we're still loading user info from local storage, don’t decide yet
  if (loading) {
    return <div>Loading...</div>; 
  }

  // If not logged in, redirect to /login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the protected content
  return <>{children}</>;
}
