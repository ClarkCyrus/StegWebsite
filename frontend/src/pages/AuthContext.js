import React, { createContext, useState, useContext, useEffect } from 'react';

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
    window.location.href = '/login'; // Redirect to login automatically
  };

  // Periodically check session status
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/current_user', { credentials: 'include' })
        .then(res => {
          if (res.status === 401) {
            logout();
          }
        });
    }, 120000); // Check every 120 seconds

    return () => clearInterval(interval);
  }, []);

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