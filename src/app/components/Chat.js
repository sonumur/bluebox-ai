"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import Sidebar from "./Sidebar";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  where,
  getDocs,
  limit
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [cursor, setCursor] = useState(true);
  const [user, setUser] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);

  // 1. Auth & Initial Setup
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u && !u.isAnonymous) {
        setUser(u);
      } else {
        // Redirect to login if no user or anonymous user
        window.location.href = "/";
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. Load last chat or create new one if none exists
  useEffect(() => {
    const initChat = async () => {
      if (user && !chatId) {
        // Try to find the most recent chat for this user
        try {
          const q = query(
            collection(db, "chats"),
            where("userId", "==", user.uid)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // Sort client-side to avoid index requirement for small/medium collections
            const sortedDocs = querySnapshot.docs.sort((a, b) => {
              const bVal = b.data().updatedAt?.toMillis() || 0;
              const aVal = a.data().updatedAt?.toMillis() || 0;
              return bVal - aVal;
            });
            setChatId(sortedDocs[0].id);
          } else {
            // No chats exist yet, create the first one
            createNewChat();
          }
        } catch (err) {
          console.error("Error loading last chat:", err);
          createNewChat(); // Fallback
        }
      }
    };
    initChat();
  }, [user, chatId]); // keep chatId in deps to avoid race conditions, but guard with !chatId

  const createNewChat = async () => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, "chats"), {
        userId: user.uid,
        createdAt: serverTimestamp(),
        title: "New Chat",
        updatedAt: serverTimestamp()
      });
      setChatId(docRef.id);
      setMessages([]); // Clear for new chat
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  // 3. Load Messages for current Chat ID
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setMessages(prev => {
        // Keep any local messages that are currently "streaming" or "pending" (id starts with temp-)
        const tempMsgs = prev.filter(m => m.id?.toString().startsWith('temp-'));

        // Return combined list, ensuring we don't duplicate (though temp- IDs are usually unique)
        return [...dbMsgs, ...tempMsgs.filter(tm => !dbMsgs.some(dm => dm.id === tm.id))];
      });
    });

    return () => unsubscribe();
  }, [chatId]);

  // 4. Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // 5. Cursor Blinking
  useEffect(() => {
    if (!typing) return;
    const interval = setInterval(() => setCursor(prev => !prev), 500);
    return () => clearInterval(interval);
  }, [typing]);


  async function sendMessage(userMessage) {
    if (!userMessage.trim() || !chatId) return;

    setTyping(true);

    try {
      const messageData = {
        role: "user",
        createdAt: serverTimestamp(),
        type: "text",
        content: userMessage
      };

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);

      // Update Chat Title if it's the first message
      if (messages.length === 0) {
        try {
          const titleText = userMessage.trim();
          const title = titleText.slice(0, 30) + (titleText.length > 30 ? "..." : "");
          await updateDoc(doc(db, "chats", chatId), { title: title });
        } catch (err) {
          console.warn("Could not update chat title:", err.message);
        }
      }

      const isNewsRequest =
        userMessage.toLowerCase().includes("news") ||
        userMessage.toLowerCase().includes("headlines") ||
        userMessage.toLowerCase().includes("trending");

      let newsContext = "";

      // 📰 NEWS FETCH (Real-time!)
      if (isNewsRequest) {
        console.log("Chat: News request detected, fetching headlines...");
        setMessages(prev => [
          ...prev,
          { role: "assistant", type: "text", content: "Bluebox is searching for the latest news...", id: "temp-news-status" }
        ]);

        try {
          const newsRes = await fetch("/api/news");
          const newsData = await newsRes.json();
          if (newsData.headlines && newsData.headlines.length > 0) {
            newsContext = "Here are the latest news headlines I found:\n" +
              newsData.headlines.map(h => `- ${h.title} (Source: ${h.source})`).join("\n");
          }
        } catch (newsErr) {
          console.error("Chat: News fetch failed:", newsErr);
        } finally {
          setMessages(prev => prev.filter(m => m.id !== "temp-news-status"));
        }
      }

      // Prepare history for API (Including System Prompt for consistency)
      const baseSystemMsg = "You are Bluebox, a friendly AI assistant. Your name is ONLY Bluebox - never introduce yourself with any other name. You were created specifically for this application. CRITICAL: Never mention LLaMA, Meta, Llama models, or any other AI company or model names. If asked about your identity, simply say 'I'm Bluebox, your AI assistant.' Keep your responses conversational, warm, and helpful. Use natural language and be personable.";
      const systemPrompt = {
        role: "system",
        content: newsContext
          ? `${baseSystemMsg}\n\nUSER REQUESTED NEWS. Use this context to answer:\n\n${newsContext}`
          : baseSystemMsg
      };

      const cleanMessages = [systemPrompt];

      // Add history
      messages.forEach(m => {
        cleanMessages.push({
          role: m.role,
          content: m.content
        });
      });

      // Add current user message
      cleanMessages.push({
        role: "user",
        content: userMessage
      });

      //  TEXT RESPONSE
      let aiText = "";

      // Show immediate thinking status
      setMessages(prev => [
        ...prev,
        { role: "assistant", type: "text", content: "Bluebox is analyzing...", id: "temp-stream" }
      ]);

      console.log("Chat: Generating via API...");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: cleanMessages })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "AI service failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let lastUpdate = Date.now();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (chunk.trim() === "" || chunk.trim().toLowerCase() === "bluebox") continue;
        aiText += chunk;

        // Throttle state updates for smoothness (approx 16 updates per second)
        const now = Date.now();
        if (now - lastUpdate > 60) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last?.id === "temp-stream") {
              return [...prev.slice(0, -1), { ...last, content: aiText || "Bluebox is typing..." }];
            }
            return [...prev, { role: "assistant", type: "text", content: aiText || "Bluebox is typing...", id: "temp-stream" }];
          });
          lastUpdate = now;
        }
      }

      // Ensure final state is captured
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== "temp-stream");
        return [...filtered, { role: "assistant", type: "text", content: aiText || "...", id: "temp-stream" }];
      });

      // Save Final AI Message to DB
      if (aiText.trim()) {
        await addDoc(collection(db, "chats", chatId, "messages"), {
          role: "assistant",
          type: "text",
          content: aiText.trim(),
          createdAt: serverTimestamp()
        });
      }

    } catch (err) {
      console.error(err);

      let errorMessage = "⚠️ Error talking to Bluebox";

      // Try to parse error if it came from our API
      if (err?.message?.includes("AI service failed")) {
        try {
          const rawError = err.message.replace("AI service failed: ", "");
          const errJson = JSON.parse(rawError);
          if (errJson.error) {
            errorMessage = `⚠️ ${errJson.error}`;
          }
        } catch (e) {
          errorMessage = `⚠️ ${err.message}`;
        }
      } else {
        errorMessage = `⚠️ ${err?.message || "Unknown error"}`;
      }

      await addDoc(collection(db, "chats", chatId, "messages"), {
        role: "assistant",
        type: "text",
        content: errorMessage,
        createdAt: serverTimestamp()
      });
    } finally {
      setTyping(false);
      // Explicitly clear the local temp stream
      setMessages(prev => prev.filter(m => m.id !== "temp-stream"));
    }
  }


  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden relative">

      {/* SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectChat={(id) => setChatId(id)}
        onNewChat={createNewChat}
        activeChatId={chatId}
      />

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative z-10 h-full bg-white">

        {/* Header (with Hamburger & Model Selector) */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 border-b border-gray-100">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-3 p-1.5 md:hidden text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-xl cursor-not-allowed transition-colors text-sm font-medium text-gray-700">
              <div className="w-6 h-6 bg-[#4d6bfe]/10 rounded-md flex items-center justify-center p-1">
                <img src="/logo.svg" alt="Bluebox Logo" className="w-full h-full" />
              </div>
              Bluebox-V1
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Share button removed as per user request */}
          </div>
        </div>

        {/* MESSAGES LIST */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="max-w-3xl mx-auto pt-8 pb-32 min-h-full">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-[#4d6bfe]/10 text-[#4d6bfe] rounded-2xl flex items-center justify-center mb-6 animate-bounce transition-all duration-[3000ms]">
                  <img src="/logo.svg" alt="Bluebox Logo" className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-semibold text-gray-800 mb-2">What brings you here today?</h2>
                <p className="text-gray-500 max-w-sm">I'm Bluebox, your AI assistant. Ask me anything or search the latest news.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id || i}
                    role={msg.role}
                    content={
                      msg.type === "image"
                        ? { image: msg.content }
                        : msg.content
                    }
                    isTyping={
                      typing &&
                      i === messages.length - 1 &&
                      msg.role === "assistant"
                    }
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} className="h-10" />
          </div>
        </div>

        {/* INPUT BAR (Floating at bottom constrained to parent) */}
        <div className="absolute bottom-6 left-0 right-0 px-4 z-20">
          <div className="max-w-3xl mx-auto">
            <InputBar onSend={sendMessage} />
            <div className="mt-4 text-center">
              <p className="text-[10px] text-gray-400 font-medium">
                Bluebox can make mistakes. Please check important information.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
