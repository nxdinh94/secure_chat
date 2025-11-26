import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

export const aesService = {
  encrypt: async (plaintext: string, key: string) => {
    const response = await axios.post(`${API_BASE_URL}/aes/encrypt`, {
      plaintext,
      key
    });
    return response.data;
  },
  decrypt: async (ciphertext: string, key: string) => {
    const response = await axios.post(`${API_BASE_URL}/aes/decrypt`, {
      ciphertext,
      key
    });
    return response.data;
  }
};

export const rsaService = {
  generateKeys: async () => {
    const response = await axios.post(`${API_BASE_URL}/rsa/generate-keys`);
    return response.data;
  },
  encrypt: async (plaintext: string, publicKey: string) => {
    const response = await axios.post(`${API_BASE_URL}/rsa/encrypt`, {
      plaintext,
      publicKey
    });
    return response.data;
  },
  decrypt: async (ciphertext: string, privateKey: string) => {
    const response = await axios.post(`${API_BASE_URL}/rsa/decrypt`, {
      ciphertext,
      privateKey
    });
    return response.data;
  }
};

export const hashService = {
  sha256: async (text: string) => {
    const response = await axios.post(`${API_BASE_URL}/hash/sha256`, {
      text
    });
    return response.data;
  },
  compare: async (hash1: string, hash2: string) => {
    const response = await axios.post(`${API_BASE_URL}/hash/compare`, {
      hash1,
      hash2
    });
    return response.data;
  }
};

export const authAPI = {
  register: async (username: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, { username, password });
    return response.data;
  },
  login: async (username: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
    return response.data;
  },
};

export const chatAPI = {
  storePublicKey: async (username: string, publicKey: string) => {
    const response = await axios.post(`${API_BASE_URL}/chat/public-key`, { username, publicKey });
    return response.data;
  },
  deletePublicKey: async (username: string) => {
    const response = await axios.delete(`${API_BASE_URL}/chat/public-key/${username}`);
    return response.data;
  },
  getPublicKey: async (username: string) => {
    const response = await axios.get(`${API_BASE_URL}/chat/public-key/${username}`);
    return response.data;
  },
  storeSessionKey: async (sender: string, receiver: string, encryptedKey: string) => {
    const response = await axios.post(`${API_BASE_URL}/chat/session-key`, {
      sender,
      receiver,
      encryptedKey,
    });
    return response.data;
  },
  getSessionKey: async (sender: string, receiver: string) => {
    const response = await axios.get(`${API_BASE_URL}/chat/session-key/${sender}/${receiver}`);
    return response.data;
  },
  sendMessage: async (sender: string, receiver: string, encryptedContent: string, messageHash: string) => {
    const response = await axios.post(`${API_BASE_URL}/chat/messages`, {
      sender,
      receiver,
      encryptedContent,
      messageHash,
    });
    return response.data;
  },
  getMessages: async (user1: string, user2: string) => {
    const response = await axios.get(`${API_BASE_URL}/chat/messages/${user1}/${user2}`);
    return response.data;
  },
  getUsers: async (excludeUser?: string) => {
    const params = excludeUser ? { exclude: excludeUser } : {};
    const response = await axios.get(`${API_BASE_URL}/chat/users`, { params });
    return response.data;
  },
};
