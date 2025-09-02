// src/components/AgentForm.js
import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Calendar, MapPin, Users } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const AgentForm = ({ agentLink, onConversationStart }) => {
  const [agent, setAgent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    location: '',
    additional_info: {}
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get agent link from props or URL
    const linkFromUrl = agentLink || window.location.pathname.split('/agent/')[1];
    if (linkFromUrl) {
      loadAgent(linkFromUrl);
    } else {
      setError('Invalid agent link');
      setLoading(false);
    }
  }, [agentLink]);

  const loadAgent = async (link) => {
    try {
      const agentData = await api.getAgentByLink(link);
      setAgent(agentData);
      setError('');
    } catch (err) {
      console.error('Error loading agent:', err);
      const errorMessage = err.response?.status === 404 
        ? 'Agent not found or inactive' 
        : 'Failed to load agent';
      setError(errorMessage);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Get agent link from props or URL
      const linkFromUrl = agentLink || window.location.pathname.split('/agent/')[1];
      
      const response = await api.startConversation(linkFromUrl, {
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        location: formData.location,
        additional_info: formData.additional_info
      });
      
      toast.success('Conversation started successfully!');
      
      // Call the callback to switch to conversation view
      if (onConversationStart) {
        onConversationStart(response.session_id);
      } else {
        // Fallback: redirect using window.location
        window.location.href = `/conversation/${response.session_id}`;
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to start conversation';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-center text-gray-600 mt-4">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent Not Available</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please check the link or contact the agent creator.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-200"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{agent?.name}</h1>
              <p className="text-indigo-100 capitalize text-sm">
                {agent?.purpose} Data Collection
              </p>
            </div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <p className="text-sm text-indigo-100 leading-relaxed">
              Welcome! We'll have a brief conversation to collect some information. 
              Your responses will help us with our research.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />
            </div>

            {/* Age Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                Age
              </label>
              <input
                type="number"
                name="age"
                required
                min="1"
                max="120"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="Enter your age"
              />
            </div>

            {/* Gender Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 mr-2 text-gray-400" />
                Gender
              </label>
              <select
                name="gender"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.gender}
                onChange={handleInputChange}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            {/* Location Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                Location
              </label>
              <input
                type="text"
                name="location"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, Country (e.g., New York, USA)"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-2">Privacy Notice:</p>
              <ul className="space-y-1 text-xs">
                <li>• Your conversation will be recorded for research purposes</li>
                <li>• All data is stored securely and anonymized</li>
                <li>• You can stop the conversation at any time</li>
                <li>• Data is used only for the stated research purpose</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Starting Conversation...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  <span>Start Voice Conversation</span>
                </>
              )}
            </button>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-100">
              <p>Powered by Data Collection Agents</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgentForm;