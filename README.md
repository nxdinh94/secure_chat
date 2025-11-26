# Cryptography Demo Project

Dự án mã hóa và giải mã dữ liệu với 3 phương pháp:
- **AES** (Mã hóa đối xứng)
- **RSA** (Mã hóa bất đối xứng)
- **SHA-256** (Hash)

## 🚀 Cấu trúc dự án

```
final_project/
├── server/          # Backend API (Node.js + TypeScript)
└── UI/              # Frontend (React + TypeScript + Vite)
```

## 📋 Yêu cầu

- Node.js >= 16
- npm hoặc yarn

## 🔧 Cài đặt

### Backend Server

```bash
cd server
npm install
```

### Frontend UI

```bash
cd UI
npm install
```

## 🏃 Chạy dự án

### Khởi động Backend (Terminal 1)

```bash
cd server
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### Khởi động Frontend (Terminal 2)

```bash
cd UI
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

## 📚 API Endpoints

### AES Encryption/Decryption

- **POST** `/api/aes/encrypt`
  ```json
  {
    "plaintext": "Hello World",
    "key": "my-secret-key"
  }
  ```

- **POST** `/api/aes/decrypt`
  ```json
  {
    "ciphertext": "encrypted-text",
    "key": "my-secret-key"
  }
  ```

### RSA Encryption/Decryption

- **POST** `/api/rsa/generate-keys`
  - Tạo cặp public/private key

- **POST** `/api/rsa/encrypt`
  ```json
  {
    "plaintext": "Hello World",
    "publicKey": "-----BEGIN PUBLIC KEY-----..."
  }
  ```

- **POST** `/api/rsa/decrypt`
  ```json
  {
    "ciphertext": "encrypted-text",
    "privateKey": "-----BEGIN PRIVATE KEY-----..."
  }
  ```

### SHA-256 Hash

- **POST** `/api/hash/sha256`
  ```json
  {
    "text": "Hello World"
  }
  ```

- **POST** `/api/hash/compare`
  ```json
  {
    "hash1": "hash-value-1",
    "hash2": "hash-value-2"
  }
  ```

## 🎨 Tính năng UI

### DEMO 01: Mã hóa đối xứng – AES
- Nhập plaintext
- Nhập key
- Nút Encrypt → ra ciphertext dạng base64
- Nút Decrypt → ra plaintext

### DEMO 02: Mã hóa bất đối xứng – RSA
- Nút Generate Key Pair (hiển thị public/private key)
- Nhập plaintext → Encrypt bằng public key
- Copy ciphertext → Decrypt bằng private key

### DEMO 03: HASH (SHA-256)
- Nhập chuỗi → Hiển thị SHA-256 hash
- So sánh 2 hash → "Giống / không giống"

## 🎨 Thiết kế UI

- 3 tabs: Symmetric – Asymmetric – Hash
- Mỗi tab có input → button → output
- Màu pastel nhẹ nhàng
- Icons: 🔐 cho symmetric, 🔑 cho asymmetric, 🌀 cho hash

## 🛠️ Công nghệ sử dụng

### Backend
- Node.js
- Express.js
- TypeScript
- Crypto (built-in Node.js module)
- Nodemon (development)

### Frontend
- React 19
- TypeScript
- Vite
- Axios
- Lucide React (icons)

## 📝 Lưu ý

- Backend chạy trên port 3000
- Frontend chạy trên port 5173
- CORS đã được cấu hình cho phép kết nối giữa frontend và backend
- AES sử dụng AES-256-CBC với IV ngẫu nhiên
- RSA sử dụng 2048-bit key với OAEP padding
- SHA-256 hash được hiển thị dưới dạng hexadecimal

## 🔒 Bảo mật

- Key được hash bằng SHA-256 trước khi sử dụng trong AES
- RSA sử dụng OAEP padding cho bảo mật tốt hơn
- IV (Initialization Vector) được tạo ngẫu nhiên cho mỗi lần mã hóa AES

## 📄 License

MIT
