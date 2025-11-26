# Features Introduction - SecureChat

## 🎯 Application Overview

**SecureChat** is an end-to-end encrypted messaging application where the server never sees the actual message content. Only the two users involved in a conversation can read the messages, ensuring complete privacy and security.

---

## ✨ Core Features

### 🔐 End-to-End Encryption
- Messages are encrypted on the sender's device before transmission
- Server only acts as a relay, never accessing plaintext content
- Only the intended recipient can decrypt and read messages
- Based on industry-standard protocols similar to Signal and WhatsApp

### 👥 User Authentication
- Secure registration with username and password
- SHA-256 password hashing (never stores plaintext passwords)
- Simple login system with session management
- User online/offline status tracking

### 💬 Real-Time Messaging
- Instant message delivery between users
- Message history persistence
- User list showing online contacts
- Message integrity verification with visual indicators

---

## 🔒 Three Encryption Methods Implementation

SecureChat combines three cryptographic methods to provide complete security:

### 1️⃣ **Asymmetric Encryption (RSA-2048-OAEP)** - Key Exchange

**Purpose:** Securely exchange the AES session key between users

**How it works:**

```
┌─────────────────────────────────────────────────────────┐
│  User A Login                    User B Login           │
│     ↓                               ↓                   │
│  Generate RSA-2048 Key Pair    Generate RSA-2048 Pair   │
│  (Public + Private)            (Public + Private)       │
│     ↓                               ↓                   │
│  Upload Public Key             Upload Public Key        │
│  to Server                     to Server                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  User A wants to chat with User B                       │
│     ↓                                                    │
│  1. Fetch B's Public Key from server                    │
│  2. Generate random AES-256 session key                 │
│  3. Encrypt AES key with B's RSA Public Key             │
│  4. Send encrypted AES key to server                    │
│     ↓                                                    │
│  User B receives encrypted AES key                      │
│     ↓                                                    │
│  5. Decrypt AES key with B's RSA Private Key            │
│     ↓                                                    │
│  ✅ Both users now share the same AES session key       │
└─────────────────────────────────────────────────────────┘
```

**Implementation Details:**
- **Algorithm:** RSA-OAEP (Optimal Asymmetric Encryption Padding)
- **Key Size:** 2048 bits
- **Hash Function:** SHA-256
- **Key Storage:** 
  - Public keys stored in MongoDB
  - Private keys kept only in browser memory (never transmitted)
- **Key Lifecycle:** Generated on login, deleted on logout

**Why RSA for Key Exchange?**
- ✅ Solves the "key distribution problem"
- ✅ No need for pre-shared secrets
- ✅ Each conversation has a unique session key
- ✅ Industry standard (used in TLS, PGP, Signal Protocol)

**Real-World Examples:**
- 🔹 **WhatsApp:** Uses Curve25519 (elliptic curve variant of RSA concept)
- 🔹 **Signal:** Double Ratchet algorithm with ECDH key exchange
- 🔹 **TLS/HTTPS:** RSA or ECDHE for session key establishment

---

### 2️⃣ **Symmetric Encryption (AES-256-GCM)** - Message Encryption

**Purpose:** Encrypt all message content for fast, secure communication

**How it works:**

```
┌──────────────────────────────────────────────────────────┐
│  SENDING A MESSAGE                                       │
│                                                          │
│  User A types: "Hello Bob!"                             │
│       ↓                                                  │
│  Plaintext → AES-256-GCM Encrypt (with shared key)      │
│       ↓                                                  │
│  Ciphertext: "a7d8f3e2b1c4..."                          │
│       ↓                                                  │
│  Send to Server → Server stores encrypted data          │
│       ↓                                                  │
│  Server forwards to User B                              │
│       ↓                                                  │
│  User B receives ciphertext                             │
│       ↓                                                  │
│  AES-256-GCM Decrypt (with shared key)                  │
│       ↓                                                  │
│  User B sees: "Hello Bob!"                              │
└──────────────────────────────────────────────────────────┘
```

**Implementation Details:**
- **Algorithm:** AES-GCM (Galois/Counter Mode)
- **Key Size:** 256 bits (32 bytes)
- **IV (Initialization Vector):** 12 bytes, randomly generated per message
- **Storage Format:** `base64(ciphertext):base64(iv)`
- **Key Reuse:** Same AES key used for entire conversation
- **Server Knowledge:** ❌ Server never sees AES keys or plaintext

**Why AES for Messages?**
- ✅ **Fast:** Can encrypt large messages, images, files efficiently
- ✅ **Secure:** AES-256 is military-grade encryption
- ✅ **Authenticated:** GCM mode provides both encryption and integrity
- ✅ **Standard:** Used by governments, banks, tech companies worldwide

**Performance Comparison:**
| Encryption | 1 MB Message | Image (5 MB) | Video (50 MB) |
|------------|--------------|--------------|---------------|
| RSA-2048   | ❌ Too slow  | ❌ Impractical | ❌ Impossible |
| AES-256    | ✅ ~5ms      | ✅ ~25ms      | ✅ ~250ms     |

**Real-World Examples:**
- 🔹 **WhatsApp:** AES-256 for all message content
- 🔹 **TLS/HTTPS:** AES-GCM for web traffic encryption
- 🔹 **iMessage:** AES-128 with RSA key wrapping
- 🔹 **Full Disk Encryption:** BitLocker, FileVault use AES

---

### 3️⃣ **Hashing (SHA-256)** - Integrity & Authentication

**Purpose:** Verify message integrity and secure password storage

**Two Uses in SecureChat:**

#### 🔐 A. Password Hashing (Authentication)

```
┌──────────────────────────────────────────────────────────┐
│  REGISTRATION                                            │
│                                                          │
│  User enters password: "MySecurePass123"                │
│       ↓                                                  │
│  SHA-256 Hash                                           │
│       ↓                                                  │
│  "5e884898da28047151d0e56f8dc6292773603d0d6aabbd..."    │
│       ↓                                                  │
│  Store ONLY hash in MongoDB                             │
│       ↓                                                  │
│  ✅ Original password never stored                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  LOGIN                                                   │
│                                                          │
│  User enters password: "MySecurePass123"                │
│       ↓                                                  │
│  SHA-256 Hash                                           │
│       ↓                                                  │
│  Compare with stored hash                               │
│       ↓                                                  │
│  Match? → Login successful ✅                           │
│  No match? → Invalid password ❌                        │
└──────────────────────────────────────────────────────────┘
```

**Security Benefits:**
- ✅ Even if database is compromised, passwords remain safe
- ✅ Server administrators cannot see user passwords
- ✅ One-way function (cannot reverse hash to get password)

#### 🛡️ B. Message Integrity Verification

```
┌──────────────────────────────────────────────────────────┐
│  SENDING MESSAGE WITH INTEGRITY CHECK                    │
│                                                          │
│  Original message: "Meet at 5 PM"                       │
│       ↓                                                  │
│  1. Calculate SHA-256 hash                              │
│     hash = "a3f8d9e7c2b1..."                            │
│       ↓                                                  │
│  2. Encrypt message with AES                            │
│     ciphertext = "x7k2m9..."                            │
│       ↓                                                  │
│  3. Send BOTH to server:                                │
│     - encryptedContent: "x7k2m9..."                     │
│     - messageHash: "a3f8d9e7c2b1..."                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  RECEIVING MESSAGE WITH VERIFICATION                     │
│                                                          │
│  Receive from server:                                   │
│     - encryptedContent: "x7k2m9..."                     │
│     - messageHash: "a3f8d9e7c2b1..."                    │
│       ↓                                                  │
│  1. Decrypt message with AES                            │
│     decrypted = "Meet at 5 PM"                          │
│       ↓                                                  │
│  2. Calculate SHA-256 of decrypted text                 │
│     computed_hash = "a3f8d9e7c2b1..."                   │
│       ↓                                                  │
│  3. Compare hashes                                      │
│       ↓                                                  │
│  Match? → Show message with ✓ verified badge           │
│  Mismatch? → Message tampered! Show warning ⚠️          │
└──────────────────────────────────────────────────────────┘
```

**Protection Against:**
- ✅ Message tampering during transmission
- ✅ Server-side data corruption
- ✅ Man-in-the-middle attacks (when combined with encryption)
- ✅ Bit-flip errors in storage or network

**Why SHA-256?**
- ✅ **Fast:** Can hash messages in milliseconds
- ✅ **Secure:** Cryptographically strong, no known collisions
- ✅ **Fixed size:** Always 256 bits regardless of input size
- ✅ **Deterministic:** Same input always produces same output

**Real-World Examples:**
- 🔹 **Git:** Uses SHA-256 for commit verification
- 🔹 **Bitcoin:** SHA-256 in proof-of-work mining
- 🔹 **Digital Signatures:** Hash + RSA = signature verification
- 🔹 **File Integrity:** Download checksums (SHA-256 hashes)

---

## 🔄 Complete Message Flow

Here's how all three methods work together when User A sends a message to User B:

```
┌────────────────────────────────────────────────────────────────┐
│  PHASE 1: INITIAL SETUP (One-time per conversation)           │
├────────────────────────────────────────────────────────────────┤
│  1. Both users login                                           │
│     → Generate RSA-2048 key pairs (Asymmetric)                │
│     → Upload public keys to server                            │
│                                                                │
│  2. User A initiates chat with User B                         │
│     → Fetch B's public key                                    │
│     → Generate AES-256 session key (Symmetric)                │
│     → Encrypt AES key with B's RSA public key (Asymmetric)   │
│     → Store encrypted AES key on server                       │
│                                                                │
│  3. User B fetches encrypted AES key                          │
│     → Decrypt with own RSA private key (Asymmetric)          │
│     → Both users now share same AES key                       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  PHASE 2: SENDING MESSAGES (Every message)                     │
├────────────────────────────────────────────────────────────────┤
│  User A types: "Hey, are we meeting today?"                   │
│     ↓                                                          │
│  1. Hash message with SHA-256 (Hash)                          │
│     messageHash = "7d4a9f3c..."                               │
│     ↓                                                          │
│  2. Encrypt with AES-256-GCM (Symmetric)                      │
│     ciphertext = "k8x2m9p4..."                                │
│     iv = "a1b2c3d4..."                                        │
│     ↓                                                          │
│  3. Send to server:                                           │
│     {                                                          │
│       sender: "alice",                                        │
│       receiver: "bob",                                        │
│       encryptedContent: "k8x2m9p4...:a1b2c3d4...",          │
│       messageHash: "7d4a9f3c..."                             │
│     }                                                          │
│     ↓                                                          │
│  4. Server stores encrypted message (sees nothing!)           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  PHASE 3: RECEIVING MESSAGES (Every message)                   │
├────────────────────────────────────────────────────────────────┤
│  User B fetches messages from server                          │
│     ↓                                                          │
│  1. Retrieve encrypted message and hash                       │
│     encryptedContent: "k8x2m9p4...:a1b2c3d4..."             │
│     storedHash: "7d4a9f3c..."                                │
│     ↓                                                          │
│  2. Decrypt with AES-256-GCM (Symmetric)                      │
│     plaintext = "Hey, are we meeting today?"                  │
│     ↓                                                          │
│  3. Verify integrity with SHA-256 (Hash)                      │
│     computedHash = SHA-256(plaintext)                         │
│     computedHash === storedHash ? ✓ : ⚠️                     │
│     ↓                                                          │
│  4. Display message with verification status                  │
│     "Hey, are we meeting today?" ✓                           │
└────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Technical Architecture

### Database Schema (MongoDB - `secure_chat`)

#### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,          // Unique username
  passwordHash: String,      // SHA-256 hash (never plaintext!)
  createdAt: Date
}
```

#### Messages Collection
```javascript
{
  _id: ObjectId,
  sender: String,            // Username of sender
  receiver: String,          // Username of receiver
  encryptedContent: String,  // AES encrypted: "ciphertext:iv"
  messageHash: String,       // SHA-256 hash of plaintext
  timestamp: Date
}
```

#### PublicKeys Collection
```javascript
{
  _id: ObjectId,
  username: String,          // User's username
  publicKey: String,         // RSA public key (Base64)
  createdAt: Date
}
// Note: User is "online" if they have a public key stored
```

#### SessionKeys Collection
```javascript
{
  _id: ObjectId,
  sender: String,            // Who created the AES key
  receiver: String,          // Who will receive it
  encryptedKey: String,      // AES key encrypted with receiver's RSA
  createdAt: Date
}
```

---

## 🎨 User Interface Features

### 🔐 Login/Register Page
- **Registration:**
  - Username input (minimum 3 characters)
  - Password input (minimum 6 characters)
  - Confirm password input
  - Instant validation feedback
  - Password hashed with SHA-256 before sending to server

- **Login:**
  - Username and password fields
  - Secure authentication (password hashed client-side)
  - Automatic RSA key pair generation on successful login
  - Public key uploaded to server (marks user as "online")

### 💬 Chat Interface
- **User List:**
  - Shows all online users (those with public keys)
  - Real-time updates (5-second polling)
  - Excludes current user
  - Join date display

- **Message View:**
  - Conversation history with selected user
  - Messages aligned by sender (sent right, received left)
  - Timestamp for each message
  - Verification badge (✓) for integrity-verified messages
  - Auto-scroll to latest message
  - "[Decryption failed]" indicator for corrupted messages

- **Message Input:**
  - Text input field
  - Send button with icon
  - Disabled state when no message
  - Real-time message delivery (3-second polling)

- **Security Indicators:**
  - 🔐 Icon showing encrypted status
  - ✓ Checkmark for verified messages
  - Online/offline user status

### 🎨 UI Theme
- **Color Scheme:**
  - Primary: Purple gradient (#667eea → #764ba2)
  - Background: Light gray (#f8f9fa)
  - Cards: White with subtle shadows
  - Accents: Pastel colors

- **Design Elements:**
  - Rounded corners (8px border-radius)
  - Smooth transitions
  - Icons from Lucide React
  - Responsive layout
  - Modern, clean aesthetic

---

## 🔐 Security Guarantees

### ✅ What SecureChat Protects Against:

1. **Server Compromise:**
   - Even if server is hacked, messages remain encrypted
   - Server never has access to AES session keys
   - Private RSA keys never leave user devices

2. **Database Breach:**
   - All message content encrypted with AES
   - Passwords hashed with SHA-256
   - No plaintext sensitive data stored

3. **Man-in-the-Middle (Partial):**
   - Message integrity verified with SHA-256 hashes
   - Tampering detected and shown to user

4. **Message Tampering:**
   - Hash verification ensures message hasn't been altered
   - Modified messages show warning instead of ✓

### ⚠️ Current Limitations:

1. **No Perfect Forward Secrecy:**
   - Same AES key used for entire conversation
   - Compromised key exposes all past messages

2. **Key Stored in localStorage:**
   - Vulnerable to XSS attacks
   - Not as secure as hardware-backed storage

3. **Basic Password Hashing:**
   - SHA-256 without salt
   - Should use bcrypt/Argon2 in production

4. **No Certificate Pinning:**
   - Vulnerable to MITM if attacker controls TLS certificate

5. **Polling Instead of WebSockets:**
   - Slight delay in message delivery
   - Not truly real-time

---

## 🌟 Why This Combination Works

The three methods complement each other perfectly:

| Method | Speed | Security | Use Case |
|--------|-------|----------|----------|
| **RSA** | 🐌 Slow | 🔒🔒🔒 Very Secure | Small data (keys only) |
| **AES** | ⚡ Very Fast | 🔒🔒🔒 Very Secure | Large data (messages) |
| **SHA-256** | ⚡ Very Fast | 🔒🔒 Secure | Verification only |

**The Synergy:**
1. **RSA** solves the "key distribution problem" → Users can exchange AES keys securely
2. **AES** provides fast encryption for all messages → Efficient communication
3. **SHA-256** ensures message integrity → Detect tampering

This is the **exact same approach** used by:
- WhatsApp (Signal Protocol)
- Telegram (MTProto)
- TLS/HTTPS
- PGP/GPG Email Encryption

---

## 🚀 Getting Started

1. **Start MongoDB:**
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

2. **Start Backend Server:**
   ```bash
   cd server
   npm install
   npm run dev
   # Runs on http://localhost:3000
   ```

3. **Start Frontend:**
   ```bash
   cd UI
   npm install
   npm run dev
   # Runs on http://localhost:5173
   ```

4. **Use the App:**
   - Register a new account
   - Login with credentials
   - Select an online user to chat
   - Start sending encrypted messages!

---

## 📚 Learn More

- [Full Documentation](./README.md)
- [API Endpoints](./README.md#api-documentation)
- [Security Architecture](./README.md#security-architecture)
- [Installation Guide](./README.md#installation--setup)

---

**Built with ❤️ using modern cryptography standards for educational purposes.**
