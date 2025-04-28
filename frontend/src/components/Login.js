import React, { useState, useEffect } from "react";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setLoggedIn(true);
        onLoginSuccess && onLoginSuccess(data);
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Error during login:", err);
      setError("Network error during login.");
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        setLoggedIn(false);
        // Optionally clear email and password fields when logging out
        setEmail("");
        setPassword("");
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Logout failed.");
      }
    } catch (err) {
      console.error("Error during logout:", err);
      setError("Network error during logout.");
    }
  };

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/current_user", {
          method: "GET",
          credentials: "include", // ensure cookies are sent
        });
        if (response.ok) {
          const data = await response.json();
          // If a user object is returned, you're logged in.
          setLoggedIn(true);
          onLoginSuccess && onLoginSuccess(data);
        }
      } catch (err) {
        console.error("User is not logged in", err);
      }
    };

    checkLoggedIn();
  }, [onLoginSuccess]);

  return (
    <div style={{ margin: "20px" }}>
      {loggedIn ? (
        <div>
          <h2>You are logged in!</h2>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div>
          <h2>Login</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div style={{ marginTop: "8px" }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div style={{ marginTop: "12px" }}>
              <button type="submit">Log In</button>
            </div>
          </form>
        </div>
      )}
      {error && (
        <div style={{ color: "red", marginTop: "10px" }}>{error}</div>
      )}
    </div>
  );
};



export default Login;