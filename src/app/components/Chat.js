"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
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
  limit,
  increment
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [cursor, setCursor] = useState(true);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  // 1. Auth & Initial Setup
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u && !u.isAnonymous) {
        setUser(u);

        // Listen to user document for role/limits
        const userRef = doc(db, "users", u.uid);
        const unsubUser = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            // --- AUTOMATED EXPIRY CHECK ---
            if (data.role === "pro" && data.subscriptionExpiry) {
              const expiry = new Date(data.subscriptionExpiry);
              const now = new Date();

              if (now > expiry) {
                console.log("Subscription expired. Reverting to Free tier...");
                const revertData = {
                  role: "free",
                  isPro: false,
                  messageLimit: 25,
                  subscriptionPlan: "Free",
                  modelTier: "basic"
                };
                await updateDoc(userRef, revertData);
                setUserData({ ...data, ...revertData });
                return;
              }
            }
            // --- END EXPIRY CHECK ---

            setUserData(data);
          } else {
            // Initialize default FREE limits for new users
            const defaultData = {
              email: u.email,
              role: "free",
              isPro: false,
              messageLimit: 25,
              tokenLimit: 10000,
              modelTier: "basic",
              dailyMessageCount: 0,
              dailyTokenCount: 0,
              lastUsageReset: new Date().toISOString().split('T')[0] // YYYY-MM-DD
            };
            setDoc(userRef, defaultData);
            setUserData(defaultData);
          }
        });
        return () => unsubUser();
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

            // Check if 12 hours have passed since the last chat was updated
            const lastChat = sortedDocs[0];
            const lastUpdatedMillis = lastChat.data().updatedAt?.toMillis() || 0;
            const nowMillis = Date.now();
            const twelveHoursMillis = 12 * 60 * 60 * 1000;
            
            if (nowMillis - lastUpdatedMillis > twelveHoursMillis) {
              console.log("Last chat is older than 12 hours. Creating a new auto-chat.");
              createNewChat();
            } else {
              setChatId(lastChat.id);
            }
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
        userEmail: user.email,
        userName: user.displayName,
        userPhotoURL: user.photoURL,
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

  // 4. Smart Auto-scroll
  useEffect(() => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;

    if (isAtBottom || !typing) {
      bottomRef.current?.scrollIntoView({ behavior: typing ? "auto" : "smooth" });
    }
  }, [messages, typing]);

  // 5. Cursor Blinking
  useEffect(() => {
    if (!typing) return;
    const interval = setInterval(() => setCursor(prev => !prev), 500);
    return () => clearInterval(interval);
  }, [typing]);


  async function sendMessage(userMessage) {
    if (!userMessage.trim() || !chatId || !user) return;

    // --- USAGE LIMIT CHECK ---
    const today = new Date().toISOString().split('T')[0];
    const isFree = !userData || userData.role === "free";

    // Check for daily reset
    let effectiveMessageCount = userData?.dailyMessageCount || 0;
    if (userData?.lastUsageReset !== today) {
      effectiveMessageCount = 0; // Reset conceptually for this request
    }

    // Check message limit for free users using the effective count
    // GUARD: If userData is still loading, we don't block them yet to avoid false-positives
    if (userData && isFree && effectiveMessageCount >= (userData?.messageLimit || 25)) {
      alert("⚠️ Daily message limit reached (25/day). Please upgrade to Pro for unlimited messages!");
      return;
    }
    // --- END USAGE LIMIT CHECK ---

    setTyping(true);

    try {
      const messageData = {
        role: "user",
        createdAt: serverTimestamp(),
        type: "text",
        content: userMessage
      };

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);

      // Increment usage count in Firestore (Atomic)
      try {
        const userRef = doc(db, "users", user.uid);
        if (userData?.lastUsageReset !== today) {
          // If first message of the day, reset and increment together
          await updateDoc(userRef, {
            dailyMessageCount: 1,
            dailyTokenCount: 0,
            lastUsageReset: today
          });
        } else {
          // Otherwise just increment
          await updateDoc(userRef, {
            dailyMessageCount: increment(1)
          });
        }
      } catch (err) {
        console.warn("Could not increment usage count:", err);
      }

      try {
        const updateData = { updatedAt: serverTimestamp() };
        if (messages.length === 0) {
          const titleText = userMessage.trim();
          updateData.title = titleText.slice(0, 30) + (titleText.length > 30 ? "..." : "");
        }
        await updateDoc(doc(db, "chats", chatId), updateData);
      } catch (err) {
        console.warn("Could not update chat:", err.message);
      }

      const userMessageLower = userMessage.toLowerCase();
      const isNewsRequest =
        userMessage.includes("[News]") ||
        userMessageLower.includes("news") ||
        userMessageLower.includes("headlines") ||
        userMessageLower.includes("trending") ||
        userMessageLower.includes("latest") ||
        userMessageLower.includes("happening") ||
        userMessageLower.includes("current events") ||
        userMessageLower.includes("updates") ||
        userMessageLower.includes("match") ||
        userMessageLower.includes("game") ||
        userMessageLower.includes("score") ||
        userMessageLower.includes("tomorrow") ||
        userMessageLower.includes("win") ||
        userMessageLower.includes("who won");

      const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);
      const isSearchRequest = userMessage.includes("[Search]") || (urlMatch && userMessageLower.includes("read"));

      let newsContext = "";
      let webContext = "";

      // 🌐 WEB ACCESS (Search or Scrape)
      if (isSearchRequest || urlMatch) {
        const queryTerm = isSearchRequest
          ? userMessage.replace("[Search]", "").trim()
          : urlMatch[0];

        if (queryTerm) {
          console.log(`Chat: Web request detected for: ${queryTerm}`);
          setMessages(prev => [
            ...prev,
            { role: "assistant", type: "text", content: `Bluebox is ${urlMatch ? 'reading the website' : 'searching the web'}...`, id: "temp-web-status" }
          ]);

          try {
            const webRes = await fetch(`/api/web?q=${encodeURIComponent(queryTerm)}`);
            const webData = await webRes.json();
            if (webData.content) {
              webContext = `REAL-TIME WEB CONTEXT (${webData.type === 'scrape' ? 'from ' + webData.url : 'Search results for ' + webData.query}):\n\n${webData.content}`;
            } else if (webData.error) {
              webContext = `The user specifically requested a web search/read for "${queryTerm}", but it failed: ${webData.error}. Please apologize and explain that you couldn't access the web at this moment.`;
            } else {
              webContext = `The user specifically requested a web search for "${queryTerm}", but no relevant results were found. Please mention this to the user.`;
            }
          } catch (webErr) {
            console.error("Chat: Web fetch failed:", webErr);
            webContext = `A web search was attempted for "${queryTerm}" but a technical error occurred. Please inform the user.`;
          } finally {
            setMessages(prev => prev.filter(m => m.id !== "temp-web-status"));
          }
        }
      }

      // 📰 NEWS FETCH (Real-time!)
      if (isNewsRequest) {
        console.log("Chat: News request detected, fetching headlines...");
        setMessages(prev => [
          ...prev,
          { role: "assistant", type: "text", content: "Bluebox is fetching latest news headlines...", id: "temp-news-status" }
        ]);

        try {
          const newsRes = await fetch("/api/news");
          const newsData = await newsRes.json();
          if (newsData.headlines && newsData.headlines.length > 0) {
            newsContext = "Here are the REAL-TIME news headlines for today:\n\n" +
              newsData.headlines.map(h => `📍 ${h.title}\n   (Source: ${h.source})`).join("\n\n");
          } else {
            newsContext = "I tried to fetch the latest news but couldn't find any recent headlines at the moment.";
          }
        } catch (newsErr) {
          console.error("Chat: News fetch failed:", newsErr);
          newsContext = "I encountered an error while trying to fetch real-time news.";
        } finally {
          setMessages(prev => prev.filter(m => m.id !== "temp-news-status"));
        }
      }

      // Prepare history for API (Including System Prompt for consistency)
      const baseSystemMsg = `You are Bluebox, a friendly AI assistant. Your name is ONLY Bluebox. You were created specifically for this application. CRITICAL: Never mention LLaMA, Meta, Llama models, or any other AI company names. Keep your responses conversational, warm, and helpful. When a user asks you to create a presentation or format content in a specific way (like PowerPoint, slides, outlines), you MUST proactively use rich markdown formatting: use clear headings (## Slide 1: Title), descriptive bullet points, bold text, and logical structure. Be highly accommodating to user formatting requests. Note: The current date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} and the current time is ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. ⚠️ IMPORTANT: If real-time context is provided below, you MUST use it to answer. Do NOT say you don't have up-to-date information if the context contains it. ⚠️ NEVER mention your "knowledge cutoff", "training data", or that you only have information up to 2023.`;
      const systemPrompt = {
        role: "system",
        content: (newsContext || webContext)
          ? `${baseSystemMsg}\n\n[REAL-TIME CONTEXT DATA]\n${newsContext}\n${webContext}\n\nUse the data above to provide an accurate, helpful, and up-to-date response. If the data is empty or failed, apologize and suggest the user try again later.`
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

      // Add current user message (Cleaned for AI)
      const displayUserMessage = userMessage
        .replace("[News]", "")
        .replace("[Search]", "")
        .replace("[BlueboxThink]", "")
        .trim();

      cleanMessages.push({
        role: "user",
        content: displayUserMessage || userMessage
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
        body: JSON.stringify({
          messages: cleanMessages,
          modelTier: userData?.modelTier || "basic"
        })
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

      // Remove temp message BEFORE saving to Firebase to prevent duplicates
      setMessages(prev => prev.filter(m => m.id !== "temp-stream"));

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
      // Handle Abortion gracefully
      if (err instanceof DOMException && err.name === "AbortError") {
        console.log("Chat: Request was aborted (likely navigation or refresh).");
        return;
      }

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

      // Remove temp message before showing error
      setMessages(prev => prev.filter(m => m.id !== "temp-stream"));

      await addDoc(collection(db, "chats", chatId, "messages"), {
        role: "assistant",
        type: "text",
        content: errorMessage,
        createdAt: serverTimestamp()
      });
    } finally {
      setTyping(false);
    }
  }


  return (
    <div className="flex h-screen h-[100dvh] bg-slate-50 font-sans text-slate-900 overflow-hidden relative">

      {/* SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectChat={(id) => setChatId(id)}
        onNewChat={createNewChat}
        activeChatId={chatId}
      />

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative z-10 h-full bg-transparent">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 glass-panel border-b border-white/40 shadow-sm z-30 relative">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-3 p-1.5 md:hidden text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100/50 rounded-xl cursor-not-allowed transition-colors text-sm font-semibold text-slate-700">
              <div className="w-6 h-6 bg-indigo-600/10 rounded-md flex items-center justify-center p-1 shadow-inner border border-indigo-50">
                <img src="/logo.svg" alt="Bluebox Logo" className="w-full h-full" />
              </div>
              Bluebox-V1
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Conditional Upgrade Button or PRO Badge */}
            {!userData?.isPro ? (
              <Link
                href="/subscription"
                className="flex items-center px-3 md:px-5 py-2 md:py-2.5 bg-[#4d6bfe] hover:bg-[#3b55d1] text-white text-[10px] md:text-sm font-semibold rounded-xl md:rounded-2xl shadow-lg shadow-[#4d6bfe]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Upgrade to Pro
              </Link>
            ) : (
              <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-600 rounded-lg md:rounded-xl">
                <Sparkles size={12} fill="currentColor" />
                <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-wider">Pro Member</span>
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES LIST CONTAINER */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div
            ref={scrollRef}
            className={`flex-1 ${messages.length === 0 ? 'overflow-hidden' : 'overflow-y-auto'} px-4 md:px-6`}
          >
            <div className="max-w-3xl mx-auto pt-8 pb-4 min-h-full flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-700">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-400 blur-[40px] opacity-20 rounded-full"></div>
                    <div className="w-20 h-20 bg-white/60 backdrop-blur-md border border-white shadow-xl text-indigo-600 rounded-3xl flex items-center justify-center mb-8 animate-bounce transition-all duration-[3000ms] relative z-10">
                      <img src="/logo.svg" alt="Bluebox Logo" className="w-12 h-12 drop-shadow-sm" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">What brings you here today?</h2>
                  <p className="text-slate-500 max-w-sm font-medium">I'm Bluebox, your AI assistant. Ask me anything or search the latest news.</p>
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
              <div ref={bottomRef} className="h-32 md:h-[20vh]" />
            </div>
          </div>

          {/* Bottom Fade Overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent z-20 pointer-events-none" />
        </div>

        {/* INPUT AREA */}
        <div className="px-4 md:px-6 py-4 md:py-6 z-30 relative">
          <div className="max-w-3xl mx-auto drop-shadow-xl relative">
            <InputBar onSend={sendMessage} isPro={userData?.isPro} />
            <div className="mt-3 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                Bluebox can make mistakes. Please check important information.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
