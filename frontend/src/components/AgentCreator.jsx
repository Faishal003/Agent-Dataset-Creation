// Updated AgentCreator.jsx - Removed participant form fields
import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const AgentCreator = ({ onBack, onAgentCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    purpose: 'medical',
    segment: '',
    knowledge: '',
    // Removed dataset_format - agent will collect data through conversation
    system_prompt: `You are a helpful data collection agent. Your primary goal is to collect participant information through natural conversation.

IMPORTANT: You MUST collect the following information in this exact order:
1. First, ask for their name politely
2. Then ask for their age
3. Then ask for their gender
4. Then ask for their location (city/country)
5. Finally ask what topic they want to discuss related to your purpose

CONVERSATION FLOW:
- Start with a warm greeting and ask for their name
- After getting their name, ask for their age naturally
- After age, ask about their gender respectfully
- After gender, ask about their location
- After location, ask what specific topic they want to discuss
- Once you have all 5 pieces of information, proceed with normal conversation

RESPONSE FORMAT: When collecting data, use clear natural language but make sure the information is easily extractable.

Be friendly, professional, and make the data collection feel like a natural part of the conversation, not an interrogation.`,
    user_prompt: 'Welcome! Please start the conversation and the agent will guide you through some questions to better assist you.'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create agent with simplified data structure
      const agentData = {
        ...formData,
        dataset_format: {
          // Default format - agent will extract this info during conversation
          name: 'string',
          age: 'number', 
          gender: 'string',
          location: 'string',
          discussion_topic: 'string'
        }
      };

      const newAgent = await api.createAgent(agentData);
      onAgentCreated(newAgent);
      toast.success('Agent created successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create agent';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const purposeOptions = [
    { value: 'medical', label: 'Medical' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'education', label: 'Education' },
    { value: 'research', label: 'Research' },
    { value: 'market_research', label: 'Market Research' },
    { value: 'social_survey', label: 'Social Survey' },
    { value: 'customer_feedback', label: 'Customer Feedback' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-700 flex items-center space-x-2 transition duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Agent</h1>
          <div className="w-32"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8">
          
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Healthcare Survey Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose *
                </label>
                <select
                  name="purpose"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.purpose}
                  onChange={handleInputChange}
                >
                  {purposeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Segment Description
              </label>
              <textarea
                name="segment"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.segment}
                onChange={handleInputChange}
                placeholder="Describe the specific segment or domain this agent will focus on..."
              />
            </div>
          </div>

          {/* Knowledge Base */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Knowledge Base
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Knowledge
              </label>
              <textarea
                name="knowledge"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.knowledge}
                onChange={handleInputChange}
                placeholder="Provide background knowledge, context, and expertise that the agent should have..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This information will help the agent understand the domain and ask relevant questions.
              </p>
            </div>
          </div>

          {/* Data Collection Info */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Data Collection Process
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Automatic Data Collection</h3>
              <p className="text-sm text-blue-800 mb-3">
                Your agent will automatically collect participant information during conversation:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Name:</strong> Agent will ask for participant's name</li>
                <li>• <strong>Age:</strong> Agent will ask for participant's age</li>
                <li>• <strong>Gender:</strong> Agent will ask for gender identity</li>
                <li>• <strong>Location:</strong> Agent will ask for location (city/country)</li>
                <li>• <strong>Discussion Topic:</strong> Agent will ask what they want to discuss</li>
              </ul>
              <p className="text-xs text-blue-600 mt-3">
                All responses will be automatically extracted and saved to your analytics dashboard.
              </p>
            </div>
          </div>

          {/* AI Configuration */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              AI Configuration
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                name="system_prompt"
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.system_prompt}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                This prompt defines how the agent collects data and behaves during conversations.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Instructions
              </label>
              <textarea
                name="user_prompt"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.user_prompt}
                onChange={handleInputChange}
                placeholder="Instructions shown to participants when they access your agent..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be displayed to participants before they start the conversation.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Agent...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Create Agent</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AgentCreator;