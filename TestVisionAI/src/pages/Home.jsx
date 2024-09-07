import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Send, Image as ImageIcon, Loader, RefreshCw } from 'lucide-react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (event) => {
    setSelectedFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files)]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (inputText.trim() === '' && selectedFiles.length === 0) {
      setError('Please enter a message or select files to send.');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));
    formData.append('text', inputText);

    try {
      const response = await axios.post('http://localhost:8000', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newMessages = [
        { type: 'user', content: inputText, files: selectedFiles.map(file => file.name) },
        ...response.data.results.map(result => ({
          type: 'ai',
          content: result.testCases,
          filename: result.filename,
        })),
      ];

      setMessages(prevMessages => [...prevMessages, ...newMessages]);
      setInputText('');
      // Removed this line to keep the selected files: setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error details:', error);
      if (error.response) {
        console.error('Server responded with:', error.response.data);
        console.error('Status code:', error.response.status);
        setError(`Server error: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        setError('No response received from server. Please check your connection.');
      } else {
        console.error('Error setting up request:', error.message);
        setError(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInputText('');
    setSelectedFiles([]);
    setError('');
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const containerStyle = {
    testCaseContainer: {
      background: '#f0f4f8',
      borderRadius: '8px',
      padding: '10px',
      marginBottom: '10px',
      border: '1px solid #e2e8f0',
    },
    testCaseDescription: {
      color: '#333',

      maxHeight: '200px', // Set a fixed height for scrollable content
      overflowY: 'auto',  // Enable vertical scrolling
    },
    even: {
      background: '#e6f4f1',
    },
    odd: {
      background: '#fff8e6',
    }
  };

  const renderMessageContent = (content) => {
    console.log("-------------------------------------")
    console.log(content)
    if (typeof content === 'string') {
      return <p>{content}</p>;
    } else if (typeof content === 'object') {
      return (
        <div>
          {Object.entries(content).map(([key, value]) => (
            <div key={key}>
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 h-screen flex flex-col" style={{
      background: 'linear-gradient(135deg, #ff6699 0%, #3366ff 100%)'
    }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Test Vision AI</h1>
        <Button onClick={startNewChat} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white">
          <RefreshCw size={20} />
          Start New Chat
        </Button>
      </div>

      <div className="flex-grow overflow-auto mb-4 border border-gray-300 rounded-lg p-4" ref={chatContainerRef} style={{
        background: 'linear-gradient(180deg, #ff99cc 0%, #99ccff 100%)',
        height: 'calc(100vh - 150px)' // Adjust based on the header and other fixed elements
      }}>
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
            <div style={{ ...containerStyle.testCaseContainer, ...(index % 2 === 0 ? containerStyle.even : containerStyle.odd) }}>
              <p className="font-semibold">{message.type === 'ai' ? `Generated for: ${message.filename}` : ''}</p>
              {message.content && (
                <div style={containerStyle.testCaseDescription}>
                  {renderMessageContent(message.content)}
                </div>
              )}
              {message.files && message.files.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Attached files:</p>
                  <ul>
                    {message.files.map((file, fileIndex) => (
                      <li key={fileIndex}>{file}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-center">
            <Loader className="animate-spin inline-block" />
            <p>Generating response...</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 text-red-500">
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-center">
        <input
          type="text"
          className="flex-grow p-2 border border-gray-300 rounded-l-lg"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message here..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button
          onClick={() => fileInputRef.current.click()}
          className="p-2 bg-gray-200 hover:bg-gray-300"
        >
          <ImageIcon size={24} />
        </Button>
        <Button onClick={handleSend} className="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600">
          <Send size={24} />
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {selectedFiles.length > 0 && (
        <div className="mt-2">
          <p className="font-semibold">Selected files:</p>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center bg-gray-100 p-2 rounded">
                <span className="mr-2">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
