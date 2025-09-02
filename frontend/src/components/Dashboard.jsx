import React, { useState, useEffect } from 'react';
import { User, Plus, MessageCircle, BarChart3, LogOut, Copy, ExternalLink, Calendar, Users, Activity, Settings, Award, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import AgentCreator from './AgentCreator';
import Analytics from './Analytics';

const Dashboard = ({ user, onLogout }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeAgents: 0,
    totalParticipants: 0,
    avgConversationDuration: 0
  });

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (agents.length > 0) {
      calculateStats();
    }
  }, [agents]);

  const loadAgents = async () => {
    try {
      const agentsData = await api.getAgents();
      setAgents(agentsData);
    } catch (err) {
      toast.error('Failed to load agents');
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      let totalConversations = 0;
      let totalParticipants = 0;
      const activeAgents = agents.filter(agent => agent.is_active).length;
      
      // In a real app, you'd fetch these stats from your API
      // For now, we'll use mock data based on agent count
      totalConversations = agents.length * Math.floor(Math.random() * 50 + 10);
      totalParticipants = Math.floor(totalConversations * 0.8);
      
      setStats({
        totalConversations,
        activeAgents,
        totalParticipants,
        avgConversationDuration: Math.floor(Math.random() * 15 + 5) // 5-20 minutes
      });
    } catch (err) {
      console.error('Failed to calculate stats:', err);
    }
  };

  const copyAgentLink = async (agentLink) => {
    const fullLink = `${window.location.origin}/agent/${agentLink}`;
    try {
      await navigator.clipboard.writeText(fullLink);
      toast.success('Agent link copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = fullLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Agent link copied to clipboard!');
    }
  };

  const openAgentLink = (agentLink) => {
    const fullLink = `${window.location.origin}/agent/${agentLink}`;
    window.open(fullLink, '_blank');
  };

  const handleAgentCreated = (newAgent) => {
    setAgents(prev => [...prev, newAgent]);
    setCurrentView('dashboard');
    toast.success('Agent created successfully!');
  };

  const getAgentPurposeColor = (purpose) => {
    const colors = {
      medical: 'from-red-400 to-pink-500',
      agriculture: 'from-green-400 to-emerald-500',
      education: 'from-blue-400 to-indigo-500',
      research: 'from-purple-400 to-violet-500',
      market_research: 'from-orange-400 to-amber-500',
      social_survey: 'from-teal-400 to-cyan-500',
      customer_feedback: 'from-indigo-400 to-blue-500',
      other: 'from-gray-400 to-slate-500'
    };
    return colors[purpose] || colors.other;
  };

  const getAgentPurposeIcon = (purpose) => {
    const icons = {
      medical: '🏥',
      agriculture: '🌱',
      education: '📚',
      research: '🔬',
      market_research: '📊',
      social_survey: '👥',
      customer_feedback: '💬',
      other: '🤖'
    };
    return icons[purpose] || icons.other;
  };

  if (currentView === 'create-agent') {
    return (
      <AgentCreator 
        onBack={() => setCurrentView('dashboard')} 
        onAgentCreated={handleAgentCreated}
      />
    );
  }

  if (currentView === 'analytics' && selectedAgent) {
    return (
      <Analytics 
        agent={selectedAgent} 
        onBack={() => setCurrentView('dashboard')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600 text-sm">Manage your data collection agents</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Profile Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user.full_name || user.username}! 👋
                </h2>
                <p className="text-gray-600 mt-1">@{user.username}</p>
                <p className="text-gray-500 text-sm mt-1">
                  Member since {new Date(user.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 text-green-600 mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Active Account</span>
              </div>
              <p className="text-xs text-gray-500">Email: {user.email}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Agents</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{agents.length}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.activeAgents} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Conversations</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalConversations.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-2">Across all agents</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Participants</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalParticipants.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-2">Unique users engaged</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Duration</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgConversationDuration}m</p>
                <p className="text-xs text-orange-600 mt-2">Per conversation</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Agents Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Agents</h2>
              <p className="text-gray-600 mt-1">
                Create and manage your data collection agents
              </p>
            </div>
            <button
              onClick={() => setCurrentView('create-agent')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center space-x-2 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              <span>Create Agent</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl mx-auto flex items-center justify-center mb-6">
                <MessageCircle className="h-12 w-12 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No agents created yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Get started by creating your first data collection agent. Build intelligent forms that can conduct conversations and gather valuable insights.
              </p>
              <button
                onClick={() => setCurrentView('create-agent')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg transform hover:scale-105"
              >
                Create Your First Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <div key={agent.id} className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group">
                  {/* Agent Header */}
                  <div className={`bg-gradient-to-r ${getAgentPurposeColor(agent.purpose)} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full transform -translate-x-8 translate-y-8"></div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{getAgentPurposeIcon(agent.purpose)}</div>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            agent.is_active 
                              ? 'bg-white bg-opacity-20 text-white' 
                              : 'bg-red-500 bg-opacity-20 text-red-100'
                          }`}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:scale-105 transition-transform duration-200">
                        {agent.name}
                      </h3>
                      <p className="text-sm opacity-90 capitalize font-medium">
                        {agent.purpose.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Agent Content */}
                  <div className="p-6">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {agent.segment || 'No specific segment defined'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-6">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created {new Date(agent.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Award className="h-3 w-3" />
                        <span>ID: {agent.id}</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => copyAgentLink(agent.agent_link)}
                        className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-100 flex items-center justify-center space-x-1 transition-all duration-200 transform hover:scale-105"
                        title="Copy agent link to clipboard"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </button>
                      
                      <button
                        onClick={() => openAgentLink(agent.agent_link)}
                        className="bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 flex items-center justify-center transition-all duration-200 transform hover:scale-105"
                        title="Open agent form in new tab"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedAgent(agent);
                          setCurrentView('analytics');
                        }}
                        className="bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm hover:bg-green-100 flex items-center justify-center transition-all duration-200 transform hover:scale-105"
                        title="View analytics"
                      >
                        <BarChart3 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;