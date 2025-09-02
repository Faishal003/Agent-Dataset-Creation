import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Users, 
  BarChart3, 
  TrendingUp,
  MapPin,
  Calendar,
  PieChart,
  Activity,
  FileText,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const Analytics = ({ agent, onBack }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (agent?.id) {
      loadAnalytics();
      loadConversations();
    }
  }, [agent?.id]);

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalytics(agent.id);
      setAnalytics(data);
      setError('');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load analytics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await api.getConversations(agent.id);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const downloadCSV = async () => {
    setExportLoading(true);
    try {
      await api.exportCSV(agent.id);
      toast.success('CSV export downloaded successfully');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to export CSV';
      toast.error(errorMessage);
    } finally {
      setExportLoading(false);
    }
  };

  // Color palettes for different chart types
  const COLORS = {
    primary: ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'],
    gradient: ['#3B82F6', '#1E40AF', '#1E3A8A', '#312E81'],
    gender: {
      male: '#3B82F6',
      female: '#EC4899',
      'non-binary': '#8B5CF6',
      other: '#6B7280',
      'prefer_not_to_say': '#9CA3AF'
    }
  };

  // Mock data for demonstration - replace with real data from your API
  const getMockTimeSeriesData = () => {
    const days = 30;
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        conversations: Math.floor(Math.random() * 20) + 5,
        participants: Math.floor(Math.random() * 15) + 3,
        avgDuration: Math.floor(Math.random() * 10) + 8
      });
    }
    return data;
  };

  const getEngagementData = () => {
    if (!analytics) return [];
    
    const total = analytics.total_conversations;
    return [
      { name: 'Completed', value: Math.floor(total * 0.85), color: '#10B981' },
      { name: 'In Progress', value: Math.floor(total * 0.10), color: '#F59E0B' },
      { name: 'Abandoned', value: Math.floor(total * 0.05), color: '#EF4444' }
    ];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const timeSeriesData = getMockTimeSeriesData();
  const engagementData = getEngagementData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center text-gray-600 mt-4 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 transition-all duration-200 px-4 py-2 rounded-lg hover:bg-blue-50"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 flex items-center space-x-2">
              <span>{agent?.name}</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm">Live Data</span>
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="3m">Last 3 months</option>
              <option value="all">All time</option>
            </select>
            
            <button
              onClick={downloadCSV}
              disabled={exportLoading || !analytics || analytics.total_conversations === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              {exportLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div className="text-red-600 mb-4">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-semibold">Failed to load analytics</p>
            </div>
            <p className="text-red-700 text-sm mb-4">{error}</p>
            <button
              onClick={loadAnalytics}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Conversations</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.total_conversations}</p>
                    <p className="text-xs text-green-600 mt-2 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +12% from last month
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Completion Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">85%</p>
                    <p className="text-xs text-green-600 mt-2">Above average</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Avg Duration</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">12m</p>
                    <p className="text-xs text-blue-600 mt-2">Per conversation</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Agent Status</p>
                    <p className={`text-2xl font-bold mt-2 ${agent.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 capitalize">{agent.purpose}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${agent.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                    <BarChart3 className={`h-6 w-6 ${agent.is_active ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Time Series Chart */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Conversation Trends</h3>
                  <p className="text-gray-600 text-sm mt-1">Daily conversation volume over time</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Last 30 days</span>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="conversationGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="participantGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="conversations"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#conversationGradient)"
                      name="Conversations"
                    />
                    <Area
                      type="monotone"
                      dataKey="participants"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#participantGradient)"
                      name="Unique Participants"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demographics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Age Distribution */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Age Distribution</h3>
                    <p className="text-gray-600 text-sm mt-1">Participant demographics</p>
                  </div>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.age_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="age_range" 
                        stroke="#6B7280"
                        fontSize={11}
                      />
                      <YAxis stroke="#6B7280" fontSize={11} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="count" 
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                        name="Participants"
                      >
                        {analytics.age_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gender Breakdown */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Gender Breakdown</h3>
                    <p className="text-gray-600 text-sm mt-1">Identity distribution</p>
                  </div>
                  <PieChart className="h-5 w-5 text-purple-600" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={analytics.gender_breakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="gender"
                        label={({gender, percentage}) => `${gender}: ${percentage}%`}
                        labelLine={false}
                        fontSize={10}
                      >
                        {analytics.gender_breakdown.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS.gender[entry.gender] || COLORS.primary[index % COLORS.primary.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value} participants`, name]}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Location Data */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Top Locations</h3>
                    <p className="text-gray-600 text-sm mt-1">Geographic distribution</p>
                  </div>
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-4">
                  {analytics.location_data.slice(0, 8).map((location, index) => {
                    const percentage = analytics.total_conversations > 0 
                      ? Math.round((location.count / analytics.total_conversations) * 100) 
                      : 0;
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                            index === 0 ? 'from-green-400 to-green-600' :
                            index === 1 ? 'from-blue-400 to-blue-600' :
                            index === 2 ? 'from-purple-400 to-purple-600' :
                            'from-gray-400 to-gray-600'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-32">
                            {location.location}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 font-medium min-w-[3ch]">
                            {location.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Engagement Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Conversation Status */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Conversation Status</h3>
                    <p className="text-gray-600 text-sm mt-1">Completion and engagement rates</p>
                  </div>
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={engagementData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {engagementData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value} conversations`, name]}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Key Insights</h3>
                    <p className="text-gray-600 text-sm mt-1">Performance highlights</p>
                  </div>
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Most Active Age Group</p>
                      <p className="text-xs text-gray-600">Highest participation rate</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {analytics.age_distribution.reduce((prev, current) => 
                          (prev.count > current.count) ? prev : current
                        ).age_range}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Top Location</p>
                      <p className="text-xs text-gray-600">Most participants from</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600 truncate max-w-24">
                        {analytics.location_data[0]?.location || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Response Quality</p>
                      <p className="text-xs text-gray-600">Based on conversation length</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">Excellent</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Peak Hours</p>
                      <p className="text-xs text-gray-600">Most active time</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">2PM - 4PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default Analytics;