
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './types';
import { TopicSelection } from './components/TopicSelection';
import { ChatWindow } from './components/ChatWindow';
import * as geminiService from './services/geminiService';
import type { Chat } from "@google/genai"; // Use 'import type' for types

const App: React.FC = () => {
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    // Check for API_KEY presence on mount.
    // Note: process.env.API_KEY is typically set at build time or environment level.
    // For a client-side app without a backend proxy, this means it needs to be available in the browser's environment.
    // In a real deployed scenario, you'd secure this, perhaps via a backend.
    // For this exercise, we assume it's directly available as per prompt.
    if (!process.env.API_KEY) {
      setApiKeyError("Configuration Error: API Key is not available. Please ensure the API_KEY environment variable is set.");
    }
  }, []);

  const handleTopicSubmit = async (submittedTopic: string) => {
    if (apiKeyError) return; // Don't proceed if API key is already known to be missing

    setIsLoading(true);
    setChatMessages([]);
    setCurrentTopic(submittedTopic);

    try {
      const chat = await geminiService.initializeChat(submittedTopic);
      setChatInstance(chat);

      const firstAIMessagePrompt = `Hello! I'm ready to talk about "${submittedTopic}". Please give me a warm welcome and start our conversation.`;
      const initialResponse = await geminiService.sendMessageToAI(chat, firstAIMessagePrompt);
      
      const aiWelcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: initialResponse.text,
        youtubeSearchQuery: initialResponse.youtubeSearchQuery,
        timestamp: Date.now(),
      };
      setChatMessages([aiWelcomeMessage]);

    } catch (error) {
      console.error("Error initializing chat:", error);
      const errorText = error instanceof Error ? error.message : "Failed to initialize chat. Please check your API key and network connection.";
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'system',
        text: errorText,
        timestamp: Date.now(),
      };
      setChatMessages([errorMessage]);
      setCurrentTopic(null); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!chatInstance || isLoading || !messageText.trim() || apiKeyError) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: messageText,
      timestamp: Date.now(),
    };
    setChatMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await geminiService.sendMessageToAI(chatInstance, messageText);
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: aiResponse.text,
        youtubeSearchQuery: aiResponse.youtubeSearchQuery,
        timestamp: Date.now(),
      };
      setChatMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error sending message to AI:", error);
      const errorText = error instanceof Error ? error.message : "An unexpected error occurred while communicating with the AI.";
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'system',
        text: errorText,
        timestamp: Date.now(),
      };
      setChatMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 to-indigo-200 p-4 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-700">Mental Health Companion</h1>
        <p className="text-slate-600 mt-2">Your AI partner for supportive conversations.</p>
      </header>

      {apiKeyError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 w-full max-w-2xl rounded-md" role="alert">
          <p className="font-bold">Configuration Issue</p>
          <p>{apiKeyError}</p>
        </div>
      )}

      {!currentTopic && !apiKeyError && (
        <TopicSelection onTopicSubmit={handleTopicSubmit} isLoading={isLoading} />
      )}

      {currentTopic && !apiKeyError && (
        <ChatWindow
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          topic={currentTopic}
          onResetTopic={() => {
            setCurrentTopic(null);
            setChatMessages([]);
            setChatInstance(null);
          }}
        />
      )}
       <footer className="mt-8 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Mental Health Companion. Powered by Gemini.</p>
        </footer>
    </div>
  );
};

export default App;
