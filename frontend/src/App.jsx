import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ConversationInterface from './components/ConversationInterface';
import { api } from './services/api';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('login');
  const [agentLink, setAgentLink] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    
    // Check different URL patterns
    if (path.startsWith('/agent/')) {
      // Extract agent link from URL and start conversation directly
      const linkFromPath = path.split('/agent/')[1];
      setAgentLink(linkFromPath);
      startConversationDirectly(linkFromPath);
    } else if (path.startsWith('/conversation/')) {
      // Extract session ID from URL
      const sessionFromPath = path.split('/conversation/')[1];
      setSessionId(sessionFromPath);
      setCurrentView('conversation');
      setLoading(false);
    } else if (token) {
      // User is logged in, load their profile
      loadUserProfile();
    } else {
      // No token, show login
      setCurrentView('login');
      setLoading(false);
    }
  }, []);

  const startConversationDirectly = async (agentLink) => {
    try {
      // Validate agent exists and is active
      const agentData = await api.getAgentByLink(agentLink);
      
      if (!agentData) {
        throw new Error('Agent not found');
      }

      // Start conversation directly without participant form
      // The agent will collect participant data during conversation
      const response = await api.startConversationDirect(agentLink);
      
      setSessionId(response.session_id);
      setCurrentView('conversation');
      
      // Update URL to reflect conversation
      window.history.pushState({}, '', `/conversation/${response.session_id}`);
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      setCurrentView('error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
      setCurrentView('dashboard');
    } catch (err) {
      localStorage.removeItem('token');
      setCurrentView('login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
    window.history.pushState({}, '', '/');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    setCurrentView('login');
    window.history.pushState({}, '', '/');
  };

  const handleConversationStart = (sessionId) => {
    setSessionId(sessionId);
    setCurrentView('conversation');
    window.history.pushState({}, '', `/conversation/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (currentView === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent Not Available</h1>
          <p className="text-gray-600 mb-6">
            The agent you're looking for is not found or inactive.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition duration-200"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  switch (currentView) {
    case 'login':
      return <Login onLogin={handleLogin} />;
    case 'dashboard':
      return <Dashboard user={user} onLogout={handleLogout} />;
    case 'conversation':
      return <ConversationInterface sessionId={sessionId} />;
    default:
      return <Login onLogin={handleLogin} />;
  }
};

export default App;