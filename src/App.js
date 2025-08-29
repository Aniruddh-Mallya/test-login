import React, { useState } from 'react';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('Logging in...');

    // This URL will be automatically proxied to your Azure Function by Azure Static Web Apps
    const apiUrl = '/api/test-login-db';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setMessage(data.status);

      // You can add logic here to redirect or show a success message
      if (response.ok) {
        console.log('Login successful!');
      }

    } catch (error) {
      setMessage('An error occurred. Check the console for details.');
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="login-container">
      <h2>Research Management Login</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      <p className="message">{message}</p>
    </div>
  );
}

export default App;