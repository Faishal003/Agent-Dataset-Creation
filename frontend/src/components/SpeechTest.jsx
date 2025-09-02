// Create this as a separate test file: SpeechTest.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

const SpeechTest = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      initializeSpeechRecognition();
    } else {
      setError('Speech recognition is not supported in this browser');
    }
  }, []);

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
      setError('');
    };
    
    recognition.onresult = (event) => {
      console.log('Speech recognition result:', event);
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
      
      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error, event);
      setIsRecording(false);
      setError(`Error: ${event.error} - ${getErrorMessage(event.error)}`);
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
  };

  const getErrorMessage = (error) => {
    const messages = {
      'no-speech': 'No speech was detected. Please try again.',
      'audio-capture': 'Audio capture failed. Check your microphone.',
      'not-allowed': 'Microphone access denied. Please allow microphone access.',
      'network': 'Network error occurred.',
      'service-not-allowed': 'Speech recognition service not allowed.',
      'bad-grammar': 'Grammar compilation failed.',
      'language-not-supported': 'Language not supported.'
    };
    return messages[error] || 'Unknown error occurred.';
  };

  const startRecording = async () => {
    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      setError('');
      recognitionRef.current.start();
    } catch (err) {
      console.error('Microphone access error:', err);
      setError(`Microphone error: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Speech Recognition Test</h1>
        
        {!isSupported ? (
          <div className="text-red-600 text-center mb-4">
            Speech recognition is not supported in this browser
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-4 rounded-full transition duration-200 ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
              <p className="mt-2 text-sm text-gray-600">
                {isRecording ? 'Listening... Click to stop' : 'Click to start recording'}
              </p>
            </div>

            {transcript && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Transcript:</h3>
                <div className="bg-gray-100 p-3 rounded-md">
                  {transcript}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2 text-red-600">Error:</h3>
                <div className="bg-red-100 p-3 rounded-md text-red-700">
                  {error}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <h3 className="font-semibold mb-1">Debug Info:</h3>
              <p>Browser: {navigator.userAgent}</p>
              <p>HTTPS: {window.location.protocol === 'https:' ? 'Yes' : 'No'}</p>
              <p>Microphone Support: {navigator.mediaDevices ? 'Yes' : 'No'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeechTest;