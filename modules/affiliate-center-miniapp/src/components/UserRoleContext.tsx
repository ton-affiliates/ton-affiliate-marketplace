import React, { createContext, useContext, useState } from "react";

// Define types for the role and context
type UserRole = "Advertiser" | "Affiliate" | null;

interface UserRoleContextProps {
  userRole: UserRole;
  setUserRole: React.Dispatch<React.SetStateAction<UserRole>>;
}

// Create the context
const UserRoleContext = createContext<UserRoleContextProps | undefined>(undefined);

// Provider component
export const UserRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>(null);

  return (
    <UserRoleContext.Provider value={{ userRole, setUserRole }}>
      {children}
    </UserRoleContext.Provider>
  );
};

// Custom hook to use the UserRoleContext
export const useUserRole = (): UserRoleContextProps => {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
};