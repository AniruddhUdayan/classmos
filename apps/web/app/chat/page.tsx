'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../lib/api';
import type { TutorChatSession, TutorChatMessage } from '@repo/types';
import { Button, Input, Badge, Card } from '@repo/ui';
import MainLayout from '../components/MainLayout';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ClockIcon,
  SparklesIcon,
  LightBulbIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

export default function ChatPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  
  // State
  const [currentSession, setCurrentSession] = useState<TutorChatSession | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  // Load chat sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (isLoaded && user) {
        try {
          const token = await getToken();
          if (!token) return;

          const sessionsData = await apiClient.getChatSessions(token, { 
            limit: 10,
            active_only: true 
          });
          setSessions(sessionsData);
        } catch (error) {
          console.error('Error fetching sessions:', error);
        } finally {
          setLoadingSessions(false);
        }
      }
    };

    fetchSessions();
  }, [isLoaded, user, getToken]);

  // Check for topic parameter (from dashboard weak topics)
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && !currentSession) {
      setMessage(`Can you help me understand ${topic}?`);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [searchParams, currentSession]);

  const startNewSession = () => {
    setCurrentSession(null);
    setMessage('');
    setSuggestions([]);
    setError(null);
  };

  const loadSession = async (sessionId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const sessionData = await apiClient.getChatSession(token, sessionId);
      setCurrentSession(sessionData);
      setError(null);
    } catch (error) {
      console.error('Error loading session:', error);
      setError('Failed to load chat session');
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || loading || !user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await apiClient.sendChatMessage(token, {
        message: message.trim(),
        sessionId: currentSession?.sessionId
      });

      setCurrentSession(response.session);
      setSuggestions(response.suggestions || []);
      setMessage('');

      // Update sessions list if this is a new session
      if (!currentSession) {
        const updatedSessions = await apiClient.getChatSessions(token, { 
          limit: 10,
          active_only: true 
        });
        setSessions(updatedSessions);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const useSuggestion = (suggestion: string) => {
    setMessage(suggestion);
    inputRef.current?.focus();
  };

  // Robustly extract only the `response` field from AI messages
  const formatMessageText = (msg: TutorChatMessage): string => {
    const original = msg.text ?? '';
    if (msg.sender !== 'ai') return original;

    const stripFences = (t: string) => {
      const m = t.match(/```(?:json|javascript)?([\s\s]*?)```/i);
      return m?.[1]?.trim() ?? t.trim();
    };

    const extractBalanced = (t: string): string | null => {
      const start = t.search(/\{|\[/);
      if (start === -1) return null;
      const opener = t[start];
      const closer = opener === '{' ? '}' : ']';
      let depth = 0, inStr = false, quote: '"' | "'" | null = null, esc = false;
      for (let i = start; i < t.length; i++) {
        const ch = t[i];
        if (inStr) {
          if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === quote) { inStr = false; quote = null; }
        } else {
          if (ch === '"' || ch === "'") { inStr = true; quote = ch as '"' | "'"; }
          else if (ch === opener) depth++;
          else if (ch === closer) { depth--; if (depth === 0) return t.slice(start, i + 1); }
        }
      }
      return null;
    };

    const sanitize = (t: string) =>
      t.trim()
        .replace(/^[\s]*?(json|javascript)\b[:\s]*/i, '')
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/,\s*([}\]])/g, '$1');

    const tryParse = (t: string): any | null => { try { return JSON.parse(t); } catch { return null; } };

    const stripped = stripFences(original);
    const balanced = extractBalanced(stripped) ?? stripped;
    const parsed = tryParse(balanced) || tryParse(sanitize(balanced));

    let out: string | null = null;
    if (parsed && typeof parsed === 'object' && typeof parsed.response === 'string') {
      out = parsed.response;
    } else {
      const m = stripped.match(/"response"\s*:\s*"([\s\S]*?)"\s*(,|})/);
      if (m?.[1]) out = m[1];
    }

    const finalText = (out ?? stripped).replace(/\\n/g, '\n').replace(/^json\s*/i, '').replace(/^javascript\s*/i, '');
    return finalText;
  };

  if (!isLoaded) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold text-foreground">Starting AI Tutor...</h2>
            <p className="text-muted-foreground">Preparing your learning assistant...</p>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 p-6 border-b border-border bg-card/50"
        >
          <div className="w-full flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Tutor Chat</h1>
                <p className="text-muted-foreground">Get instant help and explanations</p>
              </div>
            </div>
            <Button onClick={startNewSession} variant="outline" size="sm">
              <SparklesIcon className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex w-full">
            {/* Sidebar - Chat Sessions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-80 flex-shrink-0 p-6"
            >
              <Card className="h-full leetcode-border">
                <div className="p-4 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-primary" />
                    Chat History
                  </h3>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                  {loadingSessions ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : sessions.length > 0 ? (
                    <div className="space-y-2">
                      {sessions.map((session, index) => (
                        <motion.button
                          key={session.sessionId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => loadSession(session.sessionId)}
                          className={`w-full text-left p-3 rounded-xl transition-all card-hover ${
                            currentSession?.sessionId === session.sessionId
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'bg-muted/50 hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="font-medium text-sm truncate">
                            {session.title || 'Untitled Chat'}
                          </div>
                          <div className={`text-xs mt-1 ${
                            currentSession?.sessionId === session.sessionId 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {session.messageCount} messages
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">💬</div>
                      <p className="text-muted-foreground text-sm">No chat history yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Start a new conversation!</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Main Chat Area */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 p-6 flex flex-col"
            >
              <Card className="flex-1 flex flex-col leetcode-border">
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <AcademicCapIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {currentSession ? 'Active Chat' : 'New Conversation'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Ask me anything about your studies!
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      <SparklesIcon className="w-3 h-3 mr-1" />
                      AI Tutor
                    </Badge>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  <AnimatePresence>
                    {!currentSession || currentSession.messages.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                      >
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ repeat: 3, duration: 2 }}
                          className="text-6xl mb-4"
                        >
                          🤖
                        </motion.div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to AI Tutor!</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          I'm here to help you learn and understand difficult concepts. Feel free to ask me anything!
                        </p>
                        
                        {/* Quick Start Suggestions */}
                        <div className="max-w-md mx-auto space-y-2">
                          <div className="flex items-center justify-center space-x-2 mb-3">
                            <LightBulbIcon className="w-4 h-4 text-primary" />
                            <p className="text-sm font-medium text-foreground">Try asking:</p>
                          </div>
                          {[
                            "Explain the Pythagorean theorem",
                            "What is photosynthesis?",
                            "How do I solve quadratic equations?",
                            "What caused World War I?"
                          ].map((suggestion, index) => (
                            <motion.button
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + index * 0.05 }}
                              onClick={() => useSuggestion(suggestion)}
                              className="block w-full text-left p-3 text-sm bg-muted/50 hover:bg-muted rounded-xl transition-all card-hover"
                            >
                              <span className="text-primary font-medium">"</span>
                              {suggestion}
                              <span className="text-primary font-medium">"</span>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        {currentSession.messages.map((msg, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] ${
                              msg.sender === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            } rounded-2xl p-4 shadow-sm`}>
                              <div className="whitespace-pre-wrap leading-relaxed">{formatMessageText(msg)}</div>
                              <div className={`text-xs mt-2 flex items-center ${
                                msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                <ClockIcon className="w-3 h-3 mr-1" />
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </>
                    )}
                    
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-muted text-foreground rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center space-x-3">
                            <div className="flex space-x-1">
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                                className="w-2 h-2 bg-primary rounded-full"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                className="w-2 h-2 bg-primary rounded-full"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                className="w-2 h-2 bg-primary rounded-full"
                              />
                            </div>
                            <span className="text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Error Display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mx-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl"
                    >
                      <p className="text-destructive text-sm font-medium">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Suggestions */}
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="px-4 py-3 border-t border-border bg-muted/30"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <LightBulbIcon className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">Suggested follow-ups:</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => useSuggestion(suggestion)}
                            className="text-xs bg-background border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-all card-hover"
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-card/50">
                  <div className="flex space-x-3">
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask your tutor anything..."
                        disabled={loading}
                        className="pr-12 h-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <Button 
                      onClick={sendMessage}
                      disabled={!message.trim() || loading}
                      size="lg"
                      className="h-12 px-6"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      ) : (
                        <PaperAirplaneIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
