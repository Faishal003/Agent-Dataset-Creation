// Updated api.jsx - Added direct conversation start
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Authentication
  async login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await apiClient.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    
    return response.data;
  },

  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  async getProfile() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Agents
  async createAgent(agentData) {
    const response = await apiClient.post('/agents/', agentData);
    return response.data;
  },

  async getAgents() {
    const response = await apiClient.get('/agents/');
    return response.data;
  },

  async getAgent(agentId) {
    const response = await apiClient.get(`/agents/${agentId}`);
    return response.data;
  },

  async getAgentByLink(agentLink) {
    const response = await apiClient.get(`/agents/public/${agentLink}`);
    return response.data;
  },

  // Conversations
  async startConversation(agentLink, participantData) {
    const response = await apiClient.post(
      `/conversations/start/${agentLink}`,
      participantData
    );
    return response.data;
  },

  // NEW: Start conversation directly without participant form
  async startConversationDirect(agentLink) {
    const response = await apiClient.post(
      `/conversations/start-direct/${agentLink}`
    );
    return response.data;
  },

  async getConversations(agentId) {
    const response = await apiClient.get(`/conversations/${agentId}/conversations`);
    return response.data;
  },

  // Analytics
  async getAnalytics(agentId) {
    const response = await apiClient.get(`/analytics/dashboard/${agentId}`);
    return response.data;
  },

  async exportCSV(agentId) {
    const response = await apiClient.get(`/analytics/export/${agentId}/csv`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agent_${agentId}_conversations.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // WebSocket connection helper
  createWebSocket(sessionId) {
    return new WebSocket(`ws://localhost:8000/conversations/ws/${sessionId}`);
  }
};

export default api;