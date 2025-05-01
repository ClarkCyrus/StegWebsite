import React, { createContext, useState, useContext } from 'react';

// Create the AuthContext
const AuthContext = createContext();

// AuthProvider component to wrap the app
export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

  // Function to log in and set the token
  const login = (token) => {
    localStorage.setItem('authToken', token);
    setAuthToken(token);
  };

  // Function to log out and clear the token
  const logout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ authToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the AuthContext
export function useAuth() {
  return useContext(AuthContext);
}