import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import { chatAPI } from './services/api';

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

  const handleLogout = async () => {
    if (currentUser) {
      try {
        // Remove public key from server to show as offline
        await chatAPI.deletePublicKey(currentUser);
      } catch (err) {
        console.error('Failed to delete public key:', err);
      }
    }
    
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    // Clear tab-specific storage
    sessionStorage.clear();
    // Optionally keep conversation keys in localStorage for history
    // If you want to clear them too, uncomment below:
    // Object.keys(localStorage).forEach(key => {
    //   if (key.startsWith('conversationKey_')) {
    //     localStorage.removeItem(key);
    //   }
    // });
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
