import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, LogOut, RefreshCw } from 'lucide-react';
import { chatAPI } from '../services/api';
import {
  generateRSAKeyPair,
  generateAESKey,
  exportAESKey,
  importAESKey,
  importRSAPublicKey,
  rsaEncrypt,
  aesEncrypt,
  aesDecrypt,
  sha256,
} from '../utils/crypto';

interface User {
  username: string;
  createdAt: string;
}

interface Message {
  _id: string;
  sender: string;
  receiver: string;
  encryptedContent: string;
  messageHash: string;
  timestamp: string;
}

interface DecryptedMessage {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
  verified: boolean;
}

interface ChatProps {
  currentUser: string;
  onLogout: () => void;
}

const Chat: React.FC<ChatProps> = ({ currentUser, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Crypto keys
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const publicKeyRef = useRef<string>('');
  const aesKeysRef = useRef<Map<string, CryptoKey>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize RSA keys on mount
  useEffect(() => {
    const initializeKeys = async () => {
      try {
        const { publicKey, privateKey } = await generateRSAKeyPair();
        privateKeyRef.current = privateKey;
        publicKeyRef.current = publicKey;

        // Store public key on server
        await chatAPI.storePublicKey(currentUser, publicKey);
      } catch (err) {
        console.error('Failed to initialize keys:', err);
        setError('Failed to initialize encryption keys');
      }
    };

    initializeKeys();
    fetchUsers();
  }, [currentUser]);

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await chatAPI.getUsers(currentUser);
      setUsers(response.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // Fetch messages when a user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      // Set up polling for new messages
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch and decrypt messages
  const fetchMessages = async () => {
    if (!selectedUser) return;

    try {
      const response = await chatAPI.getMessages(currentUser, selectedUser);
      const decryptedMessages = await Promise.all(
        response.messages.map(async (msg: Message) => {
          try {
            const decrypted = await decryptMessage(msg);
            return decrypted;
          } catch (err) {
            console.error('Failed to decrypt message:', err);
            return {
              id: msg._id,
              sender: msg.sender,
              receiver: msg.receiver,
              content: '[Decryption failed]',
              timestamp: msg.timestamp,
              verified: false,
            };
          }
        })
      );
      setMessages(decryptedMessages);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  // Get or create AES session key for a user
  const getOrCreateSessionKey = async (username: string): Promise<CryptoKey> => {
    // Check if we already have a session key
    let sessionKey = aesKeysRef.current.get(username);
    if (sessionKey) {
      return sessionKey;
    }

    // Try to retrieve from localStorage
    const storedKey = localStorage.getItem(`sessionKey_${currentUser}_${username}`);
    if (storedKey) {
      sessionKey = await importAESKey(storedKey);
      aesKeysRef.current.set(username, sessionKey);
      return sessionKey;
    }

    // Generate new session key
    sessionKey = await generateAESKey();
    const exportedKey = await exportAESKey(sessionKey);
    aesKeysRef.current.set(username, sessionKey);
    localStorage.setItem(`sessionKey_${currentUser}_${username}`, exportedKey);

    // Exchange session key with the other user
    await exchangeSessionKey(username, sessionKey);

    return sessionKey;
  };

  // Exchange session key using RSA encryption
  const exchangeSessionKey = async (username: string, sessionKey: CryptoKey) => {
    try {
      const response = await chatAPI.getPublicKey(username);
      const theirPublicKey = await importRSAPublicKey(response.publicKey);
      const exportedSessionKey = await exportAESKey(sessionKey);
      // In production, encrypt the session key with their public key and send it
      await rsaEncrypt(exportedSessionKey, theirPublicKey);

      // In a real app, you'd send this encrypted key to the other user
      // For this demo, we'll store it locally with a consistent naming convention
      localStorage.setItem(`sessionKey_${username}_${currentUser}`, exportedSessionKey);
    } catch (err) {
      console.error('Failed to exchange session key:', err);
    }
  };

  // Decrypt a message
  const decryptMessage = async (msg: Message): Promise<DecryptedMessage> => {
    const isReceived = msg.receiver === currentUser;
    const otherUser = isReceived ? msg.sender : msg.receiver;

    // Get session key
    let sessionKey = aesKeysRef.current.get(otherUser);
    if (!sessionKey) {
      const storedKey = localStorage.getItem(`sessionKey_${currentUser}_${otherUser}`);
      if (!storedKey) {
        // Try the reverse naming convention
        const reverseKey = localStorage.getItem(`sessionKey_${otherUser}_${currentUser}`);
        if (reverseKey) {
          sessionKey = await importAESKey(reverseKey);
          aesKeysRef.current.set(otherUser, sessionKey);
        } else {
          throw new Error('No session key found');
        }
      } else {
        sessionKey = await importAESKey(storedKey);
        aesKeysRef.current.set(otherUser, sessionKey);
      }
    }

    // Decrypt message
    const [ciphertext, iv] = msg.encryptedContent.split(':');
    const decryptedContent = await aesDecrypt(ciphertext, iv, sessionKey);

    // Verify message integrity
    const computedHash = await sha256(decryptedContent);
    const verified = computedHash === msg.messageHash;

    return {
      id: msg._id,
      sender: msg.sender,
      receiver: msg.receiver,
      content: decryptedContent,
      timestamp: msg.timestamp,
      verified,
    };
  };

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    setLoading(true);
    setError('');

    try {
      // Get or create session key
      const sessionKey = await getOrCreateSessionKey(selectedUser);

      // Compute hash for integrity check
      const messageHash = await sha256(newMessage);

      // Encrypt message with AES
      const { ciphertext, iv } = await aesEncrypt(newMessage, sessionKey);
      const encryptedContent = `${ciphertext}:${iv}`;

      // Send message to server
      await chatAPI.sendMessage(currentUser, selectedUser, encryptedContent, messageHash);

      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '1rem',
        marginBottom: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: '#667eea', margin: 0 }}>
            🔐 SecureChat
          </h2>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            Logged in as: <strong>{currentUser}</strong>
          </p>
        </div>
        <button onClick={onLogout} className="btn btn-secondary" style={{ flex: 'none' }}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
        {/* Users List */}
        <div style={{ 
          width: '250px', 
          borderRight: '2px solid #e0e0e0',
          paddingRight: '1rem',
          overflowY: 'auto',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem',
          }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Users</h3>
            <button
              onClick={fetchUsers}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#667eea',
                padding: '0.25rem',
              }}
              title="Refresh users"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          {users.length === 0 ? (
            <p style={{ color: '#999', fontSize: '0.9rem' }}>No other users yet</p>
          ) : (
            users.map((user) => (
              <div
                key={user.username}
                onClick={() => setSelectedUser(user.username)}
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedUser === user.username ? '#667eea' : '#f8f9fa',
                  color: selectedUser === user.username ? 'white' : '#333',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!selectedUser ? (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999',
            }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={64} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>Select a user to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{
                background: '#f8f9fa',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontWeight: 'bold',
                color: '#667eea',
              }}>
                💬 Chat with {selectedUser}
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '1rem',
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '8px',
              }}>
                {messages.length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center' }}>No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        marginBottom: '1rem',
                        display: 'flex',
                        justifyContent: msg.sender === currentUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          background: msg.sender === currentUser 
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'white',
                          color: msg.sender === currentUser ? 'white' : '#333',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <div style={{ marginBottom: '0.25rem' }}>{msg.content}</div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          opacity: 0.8,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}>
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          {msg.verified && <span title="Message verified">✓</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                  }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading || !newMessage.trim()}
                  style={{ flex: 'none' }}
                >
                  <Send size={20} />
                </button>
              </form>

              {error && (
                <div className="error" style={{ marginTop: '0.5rem' }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
