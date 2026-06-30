'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  Star, 
  ShoppingCart, 
  Check, 
  Plus
} from 'lucide-react';
import { useApp } from './providers/app-context';
import { Product } from '@/lib/products-data';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  products?: Product[];
  timestamp: Date;
}

export default function ChatWidget() {
  const { user, addToCart, refreshCart, applyCoupon, userPreferences, updateUserPreferences } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am **ShopNow Assist**, your personal AI shopping helper. Ask me anything about our products, store policies, or try: \n\n- "Show me footwear"\n- "What is your return policy?"\n- "Do you have mechanical keyboards?"',
      timestamp: new Date()
    }
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Show me footwear',
    'Return policy',
    'Are there shipping charges?'
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize unique sessionId and restore history from sessionStorage
  useEffect(() => {
    let id = typeof window !== 'undefined' ? sessionStorage.getItem('shopnow_chat_session') : null;
    if (!id) {
      id = 'sess-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('shopnow_chat_session', id);
      }
    }
    setSessionId(id);

    // Restore history from sessionStorage
    const storedHistory = typeof window !== 'undefined' ? sessionStorage.getItem('shopnow_chat_history') : null;
    if (storedHistory) {
      try {
        const history = JSON.parse(storedHistory);
        if (history && history.length > 0) {
          const mapped = history.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(mapped);
          
          // Derive suggestions based on the last message
          const lastMsg = history[history.length - 1];
          if (lastMsg.sender === 'user') {
            setSuggestions([]);
          }
        }
      } catch (err) {
        console.error("Failed to parse chat history from sessionStorage", err);
      }
    }
  }, [user]);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('shopnow_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom of chat window
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Hide the greeting tooltip after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !sessionId) return;

    const userMsgId = Math.random().toString(36).substring(2, 11);
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    setSuggestions([]);

    const botMsgId = Math.random().toString(36).substring(2, 11);
    let botMsgCreated = false;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          message: textToSend,
          sessionId: sessionId,
          preferences: userPreferences,
          history: messages.map(m => ({
            sender: m.sender,
            text: m.text
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to assistant');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader not available');
      }

      setIsTyping(false);

      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulatedText += chunk;

          const delimiterIndex = accumulatedText.indexOf('---METADATA---');
          let visibleText = accumulatedText;
          if (delimiterIndex !== -1) {
            visibleText = accumulatedText.substring(0, delimiterIndex);
          } else {
            const partialIndex = accumulatedText.lastIndexOf('\n---');
            if (partialIndex !== -1 && partialIndex > accumulatedText.length - 30) {
              visibleText = accumulatedText.substring(0, partialIndex);
            }
          }
          visibleText = visibleText.trim();
          
          // Strip any model-generated literal "Metadata: ..." text blocks
          visibleText = visibleText
            .replace(/metadata:\s*\{[\s\S]*\}?/gi, '')
            .replace(/metadata:\s*\[[\s\S]*\]?/gi, '')
            .replace(/metadata:\s*.*$/gi, '')
            .trim();

          if (!botMsgCreated) {
            botMsgCreated = true;
            const newBotMsg: Message = {
              id: botMsgId,
              sender: 'bot',
              text: visibleText,
              timestamp: new Date(),
              products: []
            };
            setMessages(prev => [...prev, newBotMsg]);
          } else {
            setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: visibleText } : m));
          }

          if (delimiterIndex !== -1) {
            const metadataStr = accumulatedText.substring(delimiterIndex + '---METADATA---'.length).trim();
            if (metadataStr) {
              try {
                const metadata = JSON.parse(metadataStr);
                setMessages(prev => prev.map(m => m.id === botMsgId ? { 
                  ...m, 
                  products: (metadata.products || []).slice(0, 5),
                  text: visibleText
                } : m));
                setSuggestions(metadata.suggestions || []);

                if (metadata.action === 'refresh_cart') {
                  refreshCart();
                } else if (metadata.action === 'apply_coupon' && metadata.couponCode) {
                  applyCoupon(metadata.couponCode);
                }

                if (metadata.preferences) {
                  updateUserPreferences(metadata.preferences);
                }
              } catch {
                // Ignore parser errors until full chunk arrives
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat widget error:', error);
      setIsTyping(false);
      
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(2, 11),
        sender: 'bot',
        text: "I'm having trouble connecting right now. Please ensure your internet connection is active, or check back shortly!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      setSuggestions(['Show footwear', 'Return policy']);
    }
  };

  const handleClearChat = () => {
    if (typeof window !== 'undefined') {
      const confirmNew = window.confirm("Are you sure you want to start a new chat? Your current conversation history will be lost.");
      if (!confirmNew) return;
    }

    // Clear messages from sessionStorage
    sessionStorage.removeItem('shopnow_chat_history');

    // Generate a fresh session ID
    const newId = 'sess-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
    sessionStorage.setItem('shopnow_chat_session', newId);
    setSessionId(newId);

    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Hello! I am **ShopNow Assist**, your personal AI shopping helper. Ask me anything about our products, store policies, or try: \n\n- "Show me footwear"\n- "What is your return policy?"\n- "Do you have mechanical keyboards?"',
        timestamp: new Date()
      }
    ]);
    setSuggestions([
      'Show me footwear',
      'Return policy',
      'Are there shipping charges?'
    ]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingProductId(productId);
    try {
      await addToCart(productId, 1);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setAddingProductId(null);
      }, 1200);
    }
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-zinc-950 dark:text-zinc-50">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const content = line.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-sm py-0.5 leading-relaxed text-zinc-700 dark:text-zinc-300">
            {parseBoldText(content)}
          </li>
        );
      }
      return (
        <p key={idx} className="text-sm py-0.5 min-h-[1rem] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {parseBoldText(line)}
        </p>
      );
    });
  };

  return (
    <>
      {/* 1. Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end animate-in fade-in duration-200">
          {/* Tooltip */}
          {showTooltip && (
            <div className="mb-3 mr-1 flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs text-white shadow-xl animate-bounce dark:bg-zinc-100 dark:text-black">
              <Sparkles className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700" />
              <span>Need help? Ask ShopNow Assist!</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
                className="ml-1 rounded p-0.5 hover:bg-neutral-800 dark:hover:bg-zinc-200"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setIsOpen(true);
              setShowTooltip(false);
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border bg-zinc-950 border-zinc-800 text-white hover:bg-neutral-900 dark:bg-zinc-50 dark:border-zinc-200 dark:text-black dark:hover:bg-zinc-100"
            title="Open Shopping Assistant"
          >
            <MessageSquare className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* 2. Chat Widget Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto sm:w-[380px] h-[550px] max-h-[calc(100vh-120px)] z-50 flex flex-col rounded-2xl border border-zinc-200/50 bg-white/90 shadow-2xl backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/90 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-900 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black shadow-inner">
                <Bot className="h-5 w-5" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">ShopNow Assist</h3>
                <span className="text-[10px] text-zinc-400 flex items-center gap-0.5 font-medium">
                  <Sparkles className="h-2.5 w-2.5 text-zinc-400" />
                  AI powered assistant
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClearChat}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Start New Chat"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col space-y-2">
                {/* Message Bubble */}
                <div 
                  className={`flex max-w-[85%] flex-col rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.sender === 'user'
                      ? 'ml-auto rounded-tr-none bg-zinc-200 text-white dark:bg-zinc-400 dark:text-black font-medium'
                      : 'mr-auto rounded-tl-none border border-zinc-100 bg-white text-zinc-800 dark:border-zinc-800/60 dark:bg-zinc-900 dark:text-zinc-200'
                  }`}
                >
                  {renderMessageText(msg.text)}
                </div>

                {/* Inline Product Cards */}
                {msg.products && msg.products.length > 0 && (
                  <div className="w-full pl-2">
                    <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
                      {msg.products.map((product) => (
                        <div 
                          key={product.id}
                          className="w-52 shrink-0 snap-align-start rounded-xl border border-zinc-100 bg-white p-2.5 shadow-sm hover:shadow-md transition-shadow dark:border-zinc-800/80 dark:bg-zinc-900/60 flex flex-col justify-between"
                        >
                          <Link href={`/product/${product.id}`} className="group flex-grow">
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                              <span className="absolute top-1.5 left-1.5 rounded-full bg-zinc-900/80 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-xs">
                                {product.category}
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-zinc-950 dark:text-zinc-50 line-clamp-1 group-hover:underline">
                              {product.name}
                            </h4>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                                ₹{product.price.toLocaleString('en-IN')}
                              </span>
                              <div className="flex items-center text-[10px] text-amber-500 font-medium">
                                <Star className="mr-0.5 h-3 w-3 fill-amber-500 text-amber-500" />
                                {product.rating.rate}
                              </div>
                            </div>
                          </Link>
                          
                          <button
                            onClick={(e) => handleAddToCart(e, product.id)}
                            disabled={addingProductId === product.id || product.stock === 0}
                            className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                              product.stock === 0
                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500'
                                : addingProductId === product.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200'
                            }`}
                          >
                            {product.stock === 0 ? (
                              <span>Out of Stock</span>
                            ) : addingProductId === product.id ? (
                              <>
                                <Check className="h-3 w-3 animate-in zoom-in" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-3 w-3" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex max-w-[85%] mr-auto rounded-2xl rounded-tl-none border border-zinc-100 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-reply Suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 py-2 border-t border-zinc-100/50 dark:border-zinc-900/50">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(sug)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-black dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form 
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask ShopNow Assist..."
              className="flex-grow rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-800 outline-hidden focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
