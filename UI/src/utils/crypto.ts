// SHA-256 Hash utility
export const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Generate RSA key pair
export const generateRSAKeyPair = async (): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
}> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedPublicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublicKey)));

  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey,
  };
};

// Import RSA public key from base64 string
export const importRSAPublicKey = async (publicKeyBase64: string): Promise<CryptoKey> => {
  const binaryString = atob(publicKeyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
};

// Encrypt data with RSA public key
export const rsaEncrypt = async (data: string, publicKey: CryptoKey): Promise<string> => {
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    encoded
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
};

// Decrypt data with RSA private key
export const rsaDecrypt = async (encryptedData: string, privateKey: CryptoKey): Promise<string> => {
  const binaryString = atob(encryptedData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    bytes.buffer
  );

  return new TextDecoder().decode(decrypted);
};

// Generate AES key
export const generateAESKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

// Export AES key to base64 string
export const exportAESKey = async (key: CryptoKey): Promise<string> => {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

// Import AES key from base64 string
export const importAESKey = async (keyBase64: string): Promise<CryptoKey> => {
  const binaryString = atob(keyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    'raw',
    bytes.buffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

// Encrypt message with AES
export const aesEncrypt = async (message: string, key: CryptoKey): Promise<{ 
  ciphertext: string; 
  iv: string;
}> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
  };
};

// Decrypt message with AES
export const aesDecrypt = async (
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> => {
  const ciphertextBinary = atob(ciphertext);
  const ciphertextBytes = new Uint8Array(ciphertextBinary.length);
  for (let i = 0; i < ciphertextBinary.length; i++) {
    ciphertextBytes[i] = ciphertextBinary.charCodeAt(i);
  }

  const ivBinary = atob(iv);
  const ivBytes = new Uint8Array(ivBinary.length);
  for (let i = 0; i < ivBinary.length; i++) {
    ivBytes[i] = ivBinary.charCodeAt(i);
  }

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    ciphertextBytes.buffer
  );

  return new TextDecoder().decode(decrypted);
};
