// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTelegramContext } from './TelegramContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { userInfo } = useTelegramContext(); 
  // If no userInfo => not logged in
  const isLoggedIn = userInfo !== null;

  if (!isLoggedIn) {
    // Redirect to login
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the child component
  return <>{children}</>;
}
