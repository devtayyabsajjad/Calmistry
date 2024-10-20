'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

export default function AssistancePage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);
  const currentRequestId = useRef(null);
  const sessionId = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const res = await fetch('/api/chat-history');
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
          sessionId.current = data.sessionId;
        } else {
          console.error('Failed to load chat history');
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    loadChatHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, sessionId: sessionId.current }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch response: ${errorText}`);
      }

      // Process the response...
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'An error occurred while processing your request: ' + error.message }
      ]);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
      currentRequestId.current = null;
    }
  };

  const handleStop = async () => {
    if (currentRequestId.current) {
      try {
        await fetch('/api/ollama', {
          method: 'DELETE',
          headers: { 'X-Request-ID': currentRequestId.current },
        });
      } catch (error) {
        console.error('Error stopping generation:', error);
      }
    }
    setIsGenerating(false);
  };

  return (
    <div className="flex flex-col h-screen bg-transparent">
      <div className="flex-1 overflow-hidden bg-gray-100 rounded-lg shadow-lg">
        <div className="h-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto h-full flex flex-col">
            <div className="flex-1 overflow-y-auto py-6">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-10">
                  <h1 className="text-3xl font-bold mb-4 text-black">Calmistry Psychology Assistance</h1>
                  <p>How can I assist you today?</p>
                </div>
              )}
              {messages.map((message, index) => (
                <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-3 rounded-lg shadow ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                    {message.role === 'user' ? (
                      message.content
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        className="markdown-content"
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-700 bg-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSubmit} className="flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 p-3 bg-white border border-gray-300 rounded-l-lg focus:outline-none shadow-sm"
              placeholder="Type your message..."
              disabled={isLoading}
            />
            {isGenerating ? (
              <button
                type="button"
                onClick={handleStop}
                className="p-3 bg-red-500 text-white rounded-r-lg hover:bg-red-600 focus:outline-none"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="p-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none disabled:bg-gray-500"
              >
                {isLoading ? 'Thinking...' : 'Send'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
