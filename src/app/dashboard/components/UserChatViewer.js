"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import { X, MessageSquare, Clock, User, Bot, Loader2 } from "lucide-react";

export default function UserChatViewer({ userId, userName, userEmail, onClose }) {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch all chats for the selected user
  useEffect(() => {
    async function fetchUserChats() {
      if (!userId) return;
      setLoadingChats(true);
      try {
        const q = query(
          collection(db, "chats"),
          where("userId", "==", userId),
          orderBy("updatedAt", "desc")
        );
        const snapshot = await getDocs(q);
        const userChats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setChats(userChats);
        if (userChats.length > 0) {
          setSelectedChatId(userChats[0].id);
        }
      } catch (err) {
        console.error("Error fetching user chats:", err);
      } finally {
        setLoadingChats(false);
      }
    }
    fetchUserChats();
  }, [userId]);

  // Listen to messages for the selected chat
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    const q = query(
      collection(db, "chats", selectedChatId, "messages"),
      orderBy("timestamp", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoadingMessages(false);
      setTimeout(() => scrollToBottom(), 100);
    }, (err) => {
      console.error("Error fetching messages:", err);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [selectedChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown Date";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-none">{userName || "User"}</h3>
              <p className="text-sm text-gray-500 mt-1">{userEmail}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 flex overflow-hidden bg-gray-50">
          
          {/* Sidebar - Chat List */}
          <div className="w-1/3 min-w-[280px] max-w-[360px] border-r border-gray-200 bg-white flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chat Sessions</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingChats ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No chat history found</p>
                </div>
              ) : (
                chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedChatId === chat.id 
                        ? "bg-indigo-50 border border-indigo-100 shadow-sm" 
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <p className={`text-sm font-semibold truncate ${selectedChatId === chat.id ? "text-indigo-900" : "text-gray-900"}`}>
                      {chat.title || "Untitled Chat"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Clock size={12} className={selectedChatId === chat.id ? "text-indigo-400" : "text-gray-400"} />
                      <span className={`text-[11px] font-medium ${selectedChatId === chat.id ? "text-indigo-600" : "text-gray-500"}`}>
                        {formatDate(chat.updatedAt)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Area - Messages */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            {selectedChatId ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare size={32} className="text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-500">This chat is empty.</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={idx} className={`flex gap-4 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                            isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-gray-200 text-gray-600'
                          }`}>
                            {isUser ? <User size={16} /> : <Bot size={16} />}
                          </div>
                          <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm min-w-0 break-words ${
                            isUser 
                              ? 'bg-indigo-600 text-white rounded-tr-sm' 
                              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.timestamp && (
                              <p className={`text-[10px] mt-2 font-medium ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
                                {formatDate(msg.timestamp)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <MessageSquare size={48} className="mb-4 opacity-50" />
                <p className="text-base font-medium text-gray-500">Select a chat to view messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
