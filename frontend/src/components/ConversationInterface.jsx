import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Phone, PhoneOff, Volume2, VolumeX, ArrowLeft, Download, User, Clock, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const ConversationInterface = ({ sessionId }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [initialMessageReceived, setInitialMessageReceived] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [conversationSummary, setConversationSummary] = useState(null);
  const [micLevel, setMicLevel] = useState(0);
  const [conversationStartTime, setConversationStartTime] = useState(null);

  // Refs
  const websocketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);

  useEffect(() => {
    const sessionIdFromUrl = sessionId || window.location.pathname.split('/conversation/')[1];
    if (sessionIdFromUrl) {
      connectWebSocket(sessionIdFromUrl);
      initializeSpeechRecognition();
      setConversationStartTime(new Date());
    }

    return () => {
      cleanup();
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const cleanup = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const connectWebSocket = (sessionId) => {
    try {
      const wsUrl = `ws://localhost:8000/conversations/ws/${sessionId}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        toast.success('Connected to conversation');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.error) {
            toast.error(data.error);
            return;
          }
          
          if (data.type === 'connection_info') {
            if (data.agent_name) {
              setAgentName(data.agent_name);
            }
            if (data.participant_name) {
              setParticipantName(data.participant_name);
            }
            return;
          }
          
          if (data.message) {
            const newMessage = {
              sender: 'agent',
              message: data.message,
              timestamp: new Date().toLocaleTimeString(),
              type: data.type || 'text'
            };
            
            setMessages(prev => {
              if (data.type === 'welcome' && !initialMessageReceived) {
                setInitialMessageReceived(true);
                return [newMessage];
              }
              else if (data.type !== 'welcome') {
                return [...prev, newMessage];
              }
              return prev;
            });
            
            if (voiceEnabled && 'speechSynthesis' in window) {
              speakText(data.message);
            }
          }
          
          if (data.agent_name && !agentName) {
            setAgentName(data.agent_name);
          }
          
          if (data.participant_name && !participantName) {
            setParticipantName(data.participant_name);
          }
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
        
        setLoading(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error occurred');
        setConnected(false);
        setLoading(false);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnected(false);
        
        if (event.code !== 1000) {
          toast.error('Connection lost. Please refresh the page.');
        }
      };
      
      websocketRef.current = ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      toast.error('Failed to connect to conversation');
    }
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
        setIsListening(true);
        setupMicLevelMonitoring();
      };
      
      recognition.onresult = (event) => {
        console.log('Speech recognition result:', event);
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript.trim()) {
          console.log('Final transcript:', finalTranscript);
          setCurrentMessage(finalTranscript);
          sendMessage(finalTranscript.trim(), 'voice');
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event);
        setIsRecording(false);
        setIsListening(false);
        stopMicLevelMonitoring();
        
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable microphone permissions and try again.');
        } else if (event.error === 'network') {
          toast.error('Network error occurred. Please check your internet connection.');
        } else if (event.error === 'audio-capture') {
          toast.error('No microphone found. Please check your microphone connection.');
        } else {
          toast.error(`Speech recognition error: ${event.error}. Please try again.`);
        }
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        setIsListening(false);
        stopMicLevelMonitoring();
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  };

  const setupMicLevelMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateMicLevel = () => {
        if (isRecording) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setMicLevel(average);
          requestAnimationFrame(updateMicLevel);
        }
      };
      
      updateMicLevel();
    } catch (error) {
      console.error('Error setting up microphone monitoring:', error);
    }
  };

  const stopMicLevelMonitoring = () => {
    setMicLevel(0);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = (message, type = 'text') => {
    if (!message.trim() || loading || !connected) return;
    
    const userMessage = {
      sender: 'user',
      message: message,
      timestamp: new Date().toLocaleTimeString(),
      type: type
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        message: message,
        type: type
      }));
    }
    
    setCurrentMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(currentMessage);
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        setIsRecording(true);
        recognitionRef.current.start();
        toast.success('Listening...');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsRecording(false);
        toast.error('Could not start voice recording');
      }
    } else {
      toast.error('Speech recognition not supported in this browser');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
        toast.success('Recording stopped');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    toast.success(voiceEnabled ? 'Voice disabled' : 'Voice enabled');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateConversationSummary = () => {
    const userMessages = messages.filter(msg => msg.sender === 'user');
    const agentMessages = messages.filter(msg => msg.sender === 'agent');
    const endTime = new Date();
    const duration = conversationStartTime ? Math.round((endTime - conversationStartTime) / 1000 / 60) : 0;

    return {
      participantName,
      agentName,
      duration: `${duration} minutes`,
      totalMessages: messages.length,
      userMessages: userMessages.length,
      agentMessages: agentMessages.length,
      startTime: conversationStartTime?.toLocaleString(),
      endTime: endTime.toLocaleString(),
      keyTopics: extractKeyTopics(userMessages),
      conversationFlow: messages.slice(0, 3).map(msg => ({
        sender: msg.sender,
        preview: msg.message.substring(0, 100) + (msg.message.length > 100 ? '...' : '')
      }))
    };
  };

  const extractKeyTopics = (userMessages) => {
    const allText = userMessages.map(msg => msg.message).join(' ').toLowerCase();
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'her', 'us', 'them', 'this', 'that', 'these', 'those'];
    const words = allText.split(/\s+/).filter(word => word.length > 3 && !commonWords.includes(word));
    const wordCount = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));
  };

  const endConversation = () => {
    const summary = generateConversationSummary();
    setConversationSummary(summary);
    setShowSummary(true);
    
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'User ended conversation');
    }
    
    toast.success('Conversation ended. Generating summary...');
  };

  const downloadSummary = () => {
    const summaryText = `
Conversation Summary
===================
Participant: ${conversationSummary.participantName}
Agent: ${conversationSummary.agentName}
Duration: ${conversationSummary.duration}
Started: ${conversationSummary.startTime}
Ended: ${conversationSummary.endTime}

Statistics:
- Total Messages: ${conversationSummary.totalMessages}
- User Messages: ${conversationSummary.userMessages}
- Agent Messages: ${conversationSummary.agentMessages}

Key Topics:
${conversationSummary.keyTopics.map(topic => `- ${topic.word} (mentioned ${topic.count} times)`).join('\n')}

Conversation Preview:
${conversationSummary.conversationFlow.map(msg => `${msg.sender}: ${msg.preview}`).join('\n')}

Full Conversation:
${messages.map(msg => `[${msg.timestamp}] ${msg.sender}: ${msg.message}`).join('\n')}
    `;

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-summary-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goBack = () => {
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'User navigated back');
    }
    window.history.back();
  };

  if (showSummary && conversationSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Conversation Complete</h1>
                <p className="text-green-100">Thank you for your participation!</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{conversationSummary.duration}</p>
                <p className="text-sm text-gray-600">Duration</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <MessageSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{conversationSummary.totalMessages}</p>
                <p className="text-sm text-gray-600">Total Messages</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <User className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{conversationSummary.userMessages}</p>
                <p className="text-sm text-gray-600">Your Responses</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Topics Discussed</h3>
              <div className="flex flex-wrap gap-2">
                {conversationSummary.keyTopics.map((topic, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {topic.word} ({topic.count})
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Participant:</span> {conversationSummary.participantName}</p>
                <p><span className="font-medium">Agent:</span> {conversationSummary.agentName}</p>
                <p><span className="font-medium">Started:</span> {conversationSummary.startTime}</p>
                <p><span className="font-medium">Ended:</span> {conversationSummary.endTime}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={downloadSummary}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download Summary</span>
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition duration-200"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getMicAnimationSize = () => {
    if (!isRecording) return 'w-6 h-6';
    const level = Math.min(micLevel / 50, 2); // Normalize to 0-2 range
    if (level > 1.5) return 'w-8 h-8';
    if (level > 1) return 'w-7 h-7';
    if (level > 0.5) return 'w-6 h-6';
    return 'w-5 h-5';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="text-gray-600 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100/50 transition-all duration-200 transform hover:scale-105"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {agentName ? `${agentName}` : 'AI Conversation'}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {participantName && <span>👋 {participantName}</span>}
                <span className={`flex items-center space-x-1 ${connected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}></div>
                  <span>{connected ? 'Connected' : 'Disconnected'}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleVoice}
              className={`p-3 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                voiceEnabled 
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              {isSpeaking && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>}
            </button>
            
            <button
              onClick={endConversation}
              className="bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg transform hover:scale-105"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && connected && (
            <div className="text-center py-12">
              <div className="animate-bounce mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="text-gray-600 text-lg">Connecting to {agentName || 'agent'}...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait for the welcome message</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-[1.02] ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-blue-200'
                    : message.type === 'welcome'
                    ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-green-200'
                    : 'bg-white text-gray-900 border border-gray-200 shadow-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {message.type === 'voice' && message.sender === 'user' && (
                    <div className="flex-shrink-0 mt-1">
                      <Mic className="h-4 w-4 opacity-70" />
                    </div>
                  )}
                  {message.type === 'welcome' && message.sender === 'agent' && (
                    <div className="flex-shrink-0 mt-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed font-medium">{message.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs ${
                        message.sender === 'user' 
                          ? 'text-blue-100' 
                          : message.type === 'welcome'
                          ? 'text-green-100'
                          : 'text-gray-500'
                      }`}>
                        {message.timestamp}
                      </p>
                      {message.type === 'welcome' && (
                        <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                          Welcome
                        </span>
                      )}
                      {message.type === 'voice' && (
                        <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                          🎤 Voice
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  {isSpeaking && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Volume2 className="h-4 w-4 animate-pulse" />
                      <span className="text-xs">Speaking...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200/50 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type your message or use voice..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-md bg-white/90"
              disabled={loading || !connected}
            />
            
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading || !connected}
              className={`relative px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center min-w-[60px] transform hover:scale-105 ${
                isRecording 
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg' 
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 disabled:opacity-50 shadow-md'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                <div className="flex items-center space-x-1">
                  <div className="relative">
                    <MicOff className={`transition-all duration-200 ${getMicAnimationSize()}`} />
                    {isRecording && micLevel > 10 && (
                      <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30"></div>
                    )}
                  </div>
                  {micLevel > 20 && (
                    <div className="flex space-x-1">
                      <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${Math.min(micLevel / 5, 20)}px` }}></div>
                      <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${Math.min(micLevel / 4, 25)}px`, animationDelay: '0.1s' }}></div>
                      <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${Math.min(micLevel / 3, 20)}px`, animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              ) : (
                <Mic className="h-5 w-5" />
              )}
              {isRecording && (
                <div className="absolute -inset-1 bg-red-400 rounded-xl animate-ping opacity-20"></div>
              )}
            </button>
            
            <button
              type="submit"
              disabled={loading || !currentMessage.trim() || !connected}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg transform hover:scale-105"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
          
          <div className="text-center mt-3 text-xs text-gray-600">
            {isRecording ? (
              <div className="flex items-center justify-center space-x-2 text-red-600 font-medium">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-red-600 rounded-full"></div>
                </div>
                <span>🎤 Listening... Speak clearly or click mic to stop</span>
                {micLevel > 0 && (
                  <div className="flex items-center space-x-1 ml-2">
                    <span className="text-xs">Level:</span>
                    <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full transition-all duration-100" 
                        style={{ width: `${Math.min((micLevel / 100) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <Mic className="h-3 w-3" />
                <span>Press microphone to speak or type your message</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ConversationInterface;