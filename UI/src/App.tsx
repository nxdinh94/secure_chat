import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

type ViewType = 'login' | 'register' | 'chat';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(savedUser);
      setCurrentView('chat');
    }
  }, []);

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('currentUser', username);
    setCurrentView('chat');
  };

  const handleRegisterSuccess = () => {
    setCurrentView('login');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    // Clear session keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sessionKey_')) {
        localStorage.removeItem(key);
      }
    });
    setCurrentView('login');
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>🔐 SecureChat</h1>
          <p>End-to-End Encrypted Messaging</p>
        </div>

        {currentView === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setCurrentView('register')}
          />
        )}

        {currentView === 'register' && (
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setCurrentView('login')}
          />
        )}

        {currentView === 'chat' && currentUser && (
          <Chat currentUser={currentUser} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

export default App;
