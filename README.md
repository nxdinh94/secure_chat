# SecureChat - End-to-End Encrypted Chat Application

A secure real-time chat application implementing modern cryptographic techniques including AES symmetric encryption, RSA asymmetric encryption, and SHA-256 hashing for message integrity verification.

## 🔐 Security Features

- **End-to-End Encryption**: Messages are encrypted on the client side using AES-256-GCM
- **Password Security**: SHA-256 hashing for password storage
- **Message Integrity**: SHA-256 hash verification for each message
- **Key Exchange**: RSA-2048-OAEP for secure session key establishment
- **Session Management**: Per-tab encryption keys with localStorage persistence

---

## 📋 Table of Contents

1. [Security Architecture](#security-architecture)
2. [Project Structure](#project-structure)
3. [How It Works](#how-it-works)
4. [Installation & Setup](#installation--setup)
5. [API Documentation](#api-documentation)
6. [Technology Stack](#technology-stack)

---

## 🔒 Security Architecture

### 1. Password Hashing (SHA-256)

**Question: Is password hashed before saving to database?**

✅ **YES** - Passwords are hashed using SHA-256 before storage.

**Implementation:**
```typescript
// server/src/routes/auth.routes.ts
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};
```

**Flow:**
1. User submits password during registration/login
2. Server hashes password with SHA-256
3. Only the hash (64 hex characters) is stored in MongoDB
4. Original password is never stored

**Database Schema:**
```typescript
// server/src/models/User.ts
{
  username: string,
  passwordHash: string,  // SHA-256 hash
  createdAt: Date
}
```

---

### 2. Message Encryption (AES-256-GCM)

**Question: How messages are encrypted before saving?**

Messages are encrypted **client-side** using AES-256-GCM before being sent to the server.

**Encryption Process:**

```
[User Input] → [AES-256-GCM Encryption] → [Base64 Encoding] → [Server Storage]
```

**Implementation Details:**

```typescript
// UI/src/utils/crypto.ts
export const aesEncrypt = async (message: string, key: CryptoKey): Promise<{ 
  ciphertext: string; 
  iv: string;
}> => {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Random IV
  const encoded = new TextEncoder().encode(message);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
  };
};
```

**Stored Format:**
```json
{
  "sender": "user1",
  "receiver": "user2",
  "encryptedContent": "base64_ciphertext:base64_iv",
  "messageHash": "sha256_hash_of_plaintext",
  "timestamp": "2025-11-26T..."
}
```

**Key Points:**
- **AES-256-GCM** provides both confidentiality and authenticity
- **Random IV** (12 bytes) generated for each message
- **Base64 encoding** for database storage
- Server **never sees** plaintext messages

---

### 3. Message Decryption

**Question: How messages are decrypted before showing to UI?**

Messages are decrypted **client-side** when fetched from the server.

**Decryption Flow:**

```
[Server Response] → [Base64 Decode] → [AES-256-GCM Decryption] → [SHA-256 Verify] → [UI Display]
```

**Implementation:**

```typescript
// UI/src/components/Chat.tsx
const decryptMessage = async (msg: Message): Promise<DecryptedMessage> => {
  const otherUser = msg.sender === currentUser ? msg.receiver : msg.sender;
  
  // 1. Get session key for this conversation
  const sessionKey = await getSessionKey(otherUser);
  
  // 2. Parse encrypted content (format: ciphertext:iv)
  const [ciphertext, iv] = msg.encryptedContent.split(':');
  
  // 3. Decrypt using AES-GCM
  const decryptedContent = await aesDecrypt(ciphertext, iv, sessionKey);
  
  // 4. Verify message integrity
  const computedHash = await sha256(decryptedContent);
  const verified = computedHash === msg.messageHash;
  
  return {
    content: decryptedContent,
    verified: verified  // Shows ✓ if hash matches
  };
};
```

**Security Features:**
- **Integrity Verification**: SHA-256 hash ensures message hasn't been tampered
- **Per-conversation Keys**: Each conversation has its own AES key
- **Failed Decryption Handling**: Shows "[Decryption failed]" if key mismatch

---

### 4. AES Key Exchange (RSA-OAEP)

**Question: How users receive AES key to start a chat?**

**Key Exchange Protocol:**

```
User A                                    User B
   |                                         |
   |-- 1. Generate RSA Key Pair -----------→|
   |←- 2. Store Public Key on Server -------|
   |                                         |
   |-- 3. Generate AES Session Key -------->|
   |                                         |
   |-- 4. Encrypt AES Key with B's RSA ---->|
   |                                         |
   |←- 5. Decrypt AES Key with Private Key -|
   |                                         |
   |←-------- 6. Both have AES Key -------->|
```

**Implementation:**

```typescript
// UI/src/components/Chat.tsx

// Step 1 & 2: Generate and store RSA keys on login
useEffect(() => {
  const initializeKeys = async () => {
    const { publicKey, privateKey } = await generateRSAKeyPair();
    privateKeyRef.current = privateKey; // Keep private in memory
    await chatAPI.storePublicKey(currentUser, publicKey); // Store public on server
  };
  initializeKeys();
}, [currentUser]);

// Step 3-5: Session key exchange
const getOrCreateSessionKey = async (username: string): Promise<CryptoKey> => {
  // Check localStorage for existing key
  const conversationKey = [currentUser, username].sort().join('_');
  const storedKey = localStorage.getItem(`conversationKey_${conversationKey}`);
  
  if (storedKey) {
    return await importAESKey(storedKey);
  }
  
  // Generate new AES session key
  const sessionKey = await generateAESKey();
  const exportedKey = await exportAESKey(sessionKey);
  
  // Store locally
  localStorage.setItem(`conversationKey_${conversationKey}`, exportedKey);
  
  // Exchange with other user (encrypt with their RSA public key)
  const theirPublicKey = await chatAPI.getPublicKey(username);
  await exchangeSessionKey(username, sessionKey, theirPublicKey);
  
  return sessionKey;
};
```

**Key Exchange Details:**
- **RSA-2048-OAEP** used to encrypt the AES session key
- **Web Crypto API** (`crypto.subtle`) for all operations
- **localStorage** persists keys across page refreshes
- **Conversation-based**: Keys are shared between pairs of users

---

### 5. AES Key Storage

**Question: How AES key is stored?**

**Storage Strategy:**

| Location | What's Stored | Lifetime | Purpose |
|----------|--------------|----------|---------|
| **Browser Memory** (`useRef`) | `CryptoKey` object | Current tab session | Fast access for encryption/decryption |
| **localStorage** | Base64-encoded key | Until logout/clear | Persist across page refreshes |
| **Server** | ❌ **NEVER** | N/A | Server never sees AES keys |

**Implementation:**

```typescript
// UI/src/components/Chat.tsx

// In-memory storage (per tab)
const aesKeysRef = useRef<Map<string, CryptoKey>>(new Map());

// Persistent storage (shared across tabs)
const conversationKey = [currentUser, otherUser].sort().join('_');
localStorage.setItem(
  `conversationKey_${conversationKey}`, 
  exportedAESKey  // Base64 encoded
);
```

**Storage Format:**
```javascript
// localStorage
{
  "conversationKey_alice_bob": "base64_encoded_aes_key",
  "conversationKey_alice_charlie": "base64_encoded_aes_key"
}
```

**Security Considerations:**
- ✅ Keys stored in **localStorage** (accessible only to same origin)
- ✅ **Never transmitted** to server in plaintext
- ✅ **Per-conversation** keys (key compromise affects only one chat)
- ⚠️ **Logout** should clear all keys from localStorage
- ⚠️ **Browser storage** is not as secure as hardware-backed keystores

---

### 6. Hash Implementation (SHA-256)

**Question: How hash method is implemented?**

**SHA-256 is used in TWO places:**

#### A. Password Hashing (Server-side)
```typescript
// server/src/routes/auth.routes.ts
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256')
    .update(password)
    .digest('hex');
};
```

#### B. Message Integrity Verification (Client-side)
```typescript
// UI/src/utils/crypto.ts
export const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
};
```

**Usage Flow:**
```
Send Message:
  Plaintext → SHA-256 → Hash stored with encrypted message

Receive Message:
  Decrypt → SHA-256 → Compare with stored hash → ✓ or ✗
```

**Database Storage:**
```json
{
  "encryptedContent": "encrypted_data",
  "messageHash": "a1b2c3d4e5f6...",  // SHA-256 hash of plaintext
  "timestamp": "..."
}
```

---

### 7. RSA Implementation

**Question: How RSA is implemented?**

**RSA-2048-OAEP** is used for:
1. ✅ Secure key exchange (encrypting AES session keys)
2. ✅ Public key distribution via server
3. ❌ **NOT** used for message encryption (too slow for large data)

**Implementation:**

```typescript
// UI/src/utils/crypto.ts

// Generate RSA Key Pair
export const generateRSAKeyPair = async (): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
}> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,      // 2048-bit key
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Export public key to Base64 for server storage
  const exportedPublicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublicKey)));

  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey  // Keep in memory only
  };
};

// RSA Encryption (for session key exchange)
export const rsaEncrypt = async (data: string, publicKey: CryptoKey): Promise<string> => {
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encoded
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
};

// RSA Decryption
export const rsaDecrypt = async (encryptedData: string, privateKey: CryptoKey): Promise<string> => {
  const bytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    bytes.buffer
  );
  return new TextDecoder().decode(decrypted);
};
```

**Key Management:**

| Key Type | Storage Location | Access |
|----------|-----------------|--------|
| **Public Key** | MongoDB (PublicKey collection) | Anyone can fetch |
| **Private Key** | Browser memory (`useRef`) | Never leaves client |

**Server API for Public Keys:**
```typescript
// server/src/routes/chat.routes.ts

// Store public key
POST /api/chat/public-key
{
  "username": "alice",
  "publicKey": "base64_encoded_public_key"
}

// Get public key
GET /api/chat/public-key/:username
Response: { "username": "alice", "publicKey": "..." }

// Delete public key (logout)
DELETE /api/chat/public-key/:username
```

---

### 8. How Users Can Chat Together

**Question: How users can chat together?**

**Complete Chat Flow:**

```
┌─────────────┐                                      ┌─────────────┐
│   User A    │                                      │   User B    │
└──────┬──────┘                                      └──────┬──────┘
       │                                                    │
       │ 1. Login & Generate RSA Keys                      │
       ├───────────────────────────────────────────────────┤
       │                                                    │
       │ 2. Store Public Keys on Server                    │
       ├──────────────────► [SERVER] ◄────────────────────┤
       │                                                    │
       │ 3. Fetch Online Users (with public keys)          │
       ├──────────────────► [SERVER] ◄────────────────────┤
       │                                                    │
       │ 4. Select User B                                  │
       ├───────────────────────┐                           │
       │ 5. Generate AES Key   │                           │
       │ 6. Store in localStorage                          │
       │◄──────────────────────┘                           │
       │                                                    │
       │ 7. Type Message                                   │
       ├───────────────────────┐                           │
       │ 8. Encrypt with AES   │                           │
       │ 9. Hash with SHA-256  │                           │
       │◄──────────────────────┘                           │
       │                                                    │
       │ 10. Send Encrypted Message                        │
       ├──────────────────► [SERVER] ───────────────────►  │
       │                                                    │
       │                                          11. Fetch │
       │                    ◄─────────────────────────────┤
       │                                          12. Decrypt
       │                                          13. Verify Hash
       │                                          14. Display ✓
       │                                                    │
```

**Step-by-Step:**

1. **Authentication**
   - User registers/logs in
   - Password is SHA-256 hashed and verified

2. **RSA Key Generation**
   - Each user generates RSA-2048 key pair
   - Public key uploaded to server
   - Private key stays in browser memory

3. **User Discovery**
   - GET `/api/chat/users` returns all online users
   - "Online" = has public key in database
   - Polling every 5 seconds for updates

4. **AES Session Establishment**
   - When User A selects User B:
     - Check if AES key exists in localStorage
     - If not, generate new AES-256 key
     - Store key with conversation identifier: `conversationKey_alice_bob`

5. **Message Encryption**
   ```typescript
   // UI/src/components/Chat.tsx
   const handleSendMessage = async () => {
     const sessionKey = await getOrCreateSessionKey(selectedUser);
     const messageHash = await sha256(newMessage);
     const { ciphertext, iv } = await aesEncrypt(newMessage, sessionKey);
     const encryptedContent = `${ciphertext}:${iv}`;
     
     await chatAPI.sendMessage(
       currentUser, 
       selectedUser, 
       encryptedContent, 
       messageHash
     );
   };
   ```

6. **Server Storage**
   - Server stores encrypted message in MongoDB
   - No access to plaintext or AES keys

7. **Message Retrieval**
   - GET `/api/chat/messages/:user1/:user2`
   - Returns all encrypted messages between two users
   - Polling every 3 seconds for new messages

8. **Message Decryption**
   - Retrieve AES key from localStorage
   - Decrypt ciphertext using AES-GCM
   - Verify SHA-256 hash
   - Display with ✓ if verified

**Real-time Updates:**
- **Polling mechanism** (3-second interval for messages)
- **No WebSockets** currently (could be added for true real-time)
- **User list refresh** every 5 seconds

---

## 🏗️ Project Structure

```
final_project/
├── server/                      # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── index.ts            # Express server setup
│   │   ├── config/
│   │   │   └── database.ts     # MongoDB connection
│   │   ├── models/
│   │   │   ├── User.ts         # User schema (username, passwordHash)
│   │   │   ├── Message.ts      # Message schema (encrypted content + hash)
│   │   │   └── PublicKey.ts    # Public key storage (RSA keys)
│   │   └── routes/
│   │       ├── auth.routes.ts  # Register/Login with SHA-256 hashing
│   │       └── chat.routes.ts  # Message & public key management
│   ├── package.json
│   └── tsconfig.json
│
└── UI/                          # Frontend (React + TypeScript + Vite)
    ├── src/
    │   ├── main.tsx            # App entry point
    │   ├── App.tsx             # Main app component
    │   ├── components/
    │   │   ├── Login.tsx       # Login/Register UI
    │   │   ├── Register.tsx    
    │   │   └── Chat.tsx        # Main chat interface
    │   ├── services/
    │   │   └── api.ts          # Axios API clients
    │   └── utils/
    │       └── crypto.ts       # All cryptographic functions
    │                           # (AES, RSA, SHA-256)
    ├── package.json
    └── vite.config.ts
```

---

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Create a new user account.

**Request:**
```json
{
  "username": "alice",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "username": "alice"
}
```

**Security:**
- Password is SHA-256 hashed before storage
- Minimum 3 characters for username
- Minimum 6 characters for password

---

#### POST `/api/auth/login`
Authenticate user.

**Request:**
```json
{
  "username": "alice",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "username": "alice"
}
```

**Security:**
- Compares SHA-256 hash of submitted password with stored hash
- No tokens (session-less, client handles crypto keys)

---

### Chat Endpoints

#### DELETE `/api/chat/public-key/:username`
Logout - Remove user's public key (indicates user is offline).

**Request:**
```
DELETE /api/chat/public-key/alice
```

**Response:**
```json
{
  "message": "Public key deleted successfully"
}
```

**Purpose:**
- Marks user as offline
- Other users won't see this user in their online users list
- Called automatically when user clicks logout

---

#### POST `/api/chat/public-key`
Store user's RSA public key (indicates "online" status).

**Request:**
```json
{
  "username": "alice",
  "publicKey": "base64_encoded_rsa_public_key"
}
```

**Response:**
```json
{
  "message": "Public key stored successfully"
}
```

---

#### GET `/api/chat/public-key/:username`
Retrieve a user's RSA public key for encryption.

**Response:**
```json
{
  "username": "alice",
  "publicKey": "base64_encoded_rsa_public_key"
}
```

---

#### POST `/api/chat/session-key`
Store encrypted AES session key for secure key exchange.

**Request:**
```json
{
  "sender": "alice",
  "receiver": "bob",
  "encryptedKey": "base64_encrypted_aes_key_with_bob_rsa_public_key"
}
```

**Response:**
```json
{
  "message": "Session key stored successfully"
}
```

**Purpose:**
- Sender encrypts AES key with receiver's RSA public key
- Server stores encrypted key
- Receiver can later retrieve and decrypt with their RSA private key
- Ensures both users share the same AES session key

---

#### GET `/api/chat/session-key/:sender/:receiver`
Retrieve encrypted AES session key.

**Request:**
```
GET /api/chat/session-key/alice/bob
```

**Response:**
```json
{
  "sender": "alice",
  "receiver": "bob",
  "encryptedKey": "base64_encrypted_aes_key"
}
```

**Purpose:**
- Receiver fetches the encrypted AES key
- Works bidirectionally (checks both sender→receiver and receiver→sender)
- Used during first message exchange to establish shared encryption

---

#### POST `/api/chat/messages`
Send an encrypted message.

**Request:**
```json
{
  "sender": "alice",
  "receiver": "bob",
  "encryptedContent": "base64_ciphertext:base64_iv",
  "messageHash": "sha256_hash_of_plaintext"
}
```

**Response:**
```json
{
  "message": "Message sent successfully",
  "messageId": "507f1f77bcf86cd799439011"
}
```

**Note:** Server never sees plaintext or AES keys.

---

#### GET `/api/chat/messages/:user1/:user2`
Retrieve all messages between two users.

**Response:**
```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "sender": "alice",
      "receiver": "bob",
      "encryptedContent": "base64_ciphertext:base64_iv",
      "messageHash": "a1b2c3d4...",
      "timestamp": "2025-11-26T10:30:00.000Z"
    }
  ]
}
```

---

#### GET `/api/chat/users?exclude=currentUser`
Get all online users (those with public keys stored).

**Response:**
```json
{
  "users": [
    {
      "username": "bob",
      "createdAt": "2025-11-25T08:00:00.000Z"
    },
    {
      "username": "charlie",
      "createdAt": "2025-11-26T09:15:00.000Z"
    }
  ]
}
```

---

## 💻 Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js 16+** | JavaScript runtime |
| **Express.js** | Web framework |
| **TypeScript** | Type safety |
| **MongoDB** | Database for users, messages, keys |
| **Mongoose** | ODM for MongoDB |
| **Node Crypto (built-in)** | SHA-256 password hashing |
| **CORS** | Cross-origin resource sharing |
| **dotenv** | Environment variables |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Web Crypto API** | AES, RSA, SHA-256 (browser native) |
| **Axios** | HTTP client |
| **Lucide React** | Icons |

### Cryptography
| Algorithm | Use Case | Implementation |
|-----------|----------|----------------|
| **AES-256-GCM** | Message encryption | `crypto.subtle` (browser) |
| **RSA-2048-OAEP** | Key exchange | `crypto.subtle` (browser) |
| **SHA-256** | Password hashing & message integrity | `crypto.createHash()` (server) + `crypto.subtle.digest()` (browser) |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js >= 16
- npm or yarn
- MongoDB (local or cloud instance like MongoDB Atlas)

### 1. Clone Repository
```bash
git clone <repository-url>
cd final_project
```

### 2. Setup Backend

```bash
cd server
npm install
```

Create `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/securechat
# or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/securechat
```

Start server:
```bash
npm run dev
```

Server runs at: `http://localhost:3000`

### 3. Setup Frontend

```bash
cd UI
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🧪 Testing the Application

1. **Register two users** (e.g., alice and bob)
2. **Login** with first user (alice)
3. **Open second browser/incognito window** and login with second user (bob)
4. **Both users should see each other** in the users list (online status)
5. **Select a user** to start chat
6. **Send messages** - they will be encrypted automatically
7. **Check message verification** - look for ✓ icon next to messages
8. **Test logout** - public key should be removed, user goes offline

---

## 🔐 Security Best Practices Implemented

✅ **Password Security**
- SHA-256 hashing (not plaintext storage)
- Should upgrade to bcrypt/argon2 with salt for production

✅ **End-to-End Encryption**
- Messages encrypted client-side
- Server cannot read message content

✅ **Message Integrity**
- SHA-256 hash verification prevents tampering

✅ **Forward Secrecy**
- Per-conversation AES keys
- Future: Implement key rotation

✅ **Key Management**
- Private keys never leave client
- Public keys openly shared

---

## ⚠️ Security Limitations & Future Improvements

🔴 **Current Limitations:**
1. **No Perfect Forward Secrecy** - Compromised AES key exposes all past messages
2. **localStorage Vulnerability** - Keys accessible via XSS attacks
3. **No Key Rotation** - Same AES key used for entire conversation
4. **Password Hashing** - SHA-256 should be upgraded to bcrypt/Argon2
5. **No Authentication Tokens** - No JWT or session management
6. **Polling Instead of WebSockets** - Not true real-time

🟢 **Recommended Improvements:**
1. Implement **Signal Protocol** or **Double Ratchet Algorithm**
2. Use **IndexedDB** with better access controls
3. Add **key rotation** every N messages or time period
4. Upgrade to **bcrypt/Argon2** for passwords
5. Implement **JWT tokens** with refresh mechanism
6. Add **WebSocket** support for real-time messaging
7. Implement **message deletion** and **self-destructing messages**
8. Add **file encryption** support
9. Implement **group chat** with proper key distribution

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

Created as a security demonstration project for educational purposes.

---

## 📚 References

- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Signal Protocol Documentation](https://signal.org/docs/)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
