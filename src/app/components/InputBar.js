"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function InputBar({ onSend, isPro }) {
  const [value, setValue] = useState("");
  const [blueboxThink, setBlueboxThink] = useState(false);
  const [search, setSearch] = useState(false);
  const [news, setNews] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
      setVoiceSupported(supported);
    }
  }, []);

  const typoMap = {
    "teh": "the", "spaling": "spelling", "speling": "spelling",
    "currect": "correct", "mistach": "mistake", "mistak": "mistake",
    "beleive": "believe", "recieve": "receive", "definately": "definitely",
    "seperate": "separate", "alot": "a lot", "occured": "occurred",
    "happend": "happened", "realtime": "real-time", "googl": "google"
  };

  function autoCorrectText(text) {
    return text.split(/\s+/).map(word => {
      const clean = word.toLowerCase().replace(/[.,!?;:]/g, "");
      const fix = typoMap[clean];
      if (fix) return word[0] === word[0].toUpperCase()
        ? fix.charAt(0).toUpperCase() + fix.slice(1) + word.slice(clean.length)
        : fix + word.slice(clean.length);
      return word;
    }).join(" ");
  }

  function send() {
    if (!value.trim()) return;
    let final = autoCorrectText(value);
    if (blueboxThink) final = `[BlueboxThink] ${final}`;
    if (search) final = `[Search] ${final}`;
    if (news) final = `[News] ${final}`;
    onSend(final);
    setValue("");
    setNews(false);
    setSearch(false);
    setBlueboxThink(false);
  }

  function startVoice() {
    if (listening) {
      stopVoice();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setInterimText("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim = transcript;
        }
      }

      if (final) {
        setValue(prev => (prev + " " + final).trim());
        setInterimText("");
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimText("");
  }

  return (
    <div className="w-full relative">

      {/* ── VOICE RECORDING POPUP (Portal → renders on document.body, escapes all overflow/transform traps) ── */}
      {listening && mounted && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
            animation: "fadeSlideUp 0.25s ease",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) stopVoice(); }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
              border: "1px solid #f0f0f0",
              width: "100%",
              maxWidth: "320px",
            }}
          >
            {/* Animated mic pulse ring */}
            <div className="relative flex items-center justify-center">
              <span
                className="absolute w-16 h-16 rounded-full opacity-25"
                style={{
                  background: "#ef4444",
                  animation: "micPulse 1.2s ease-out infinite",
                }}
              />
              <span
                className="absolute w-12 h-12 rounded-full opacity-40"
                style={{
                  background: "#ef4444",
                  animation: "micPulse 1.2s ease-out infinite 0.2s",
                }}
              />
              <div
                className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: "#ef4444" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </div>
            </div>

            {/* Status label */}
            <div className="text-center">
              <p className="text-sm font-bold text-gray-800">Listening…</p>
              <p className="text-xs text-gray-400 mt-0.5">Speak clearly into your microphone</p>
            </div>

            {/* Interim transcript preview */}
            {interimText && (
              <div className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-center">
                <p className="text-sm text-gray-500 italic truncate">"{interimText}"</p>
              </div>
            )}

            {/* Waveform animation bars */}
            <div className="flex items-center gap-1 h-6">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full"
                  style={{
                    background: "#ef4444",
                    animation: `waveBar 0.8s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                    height: `${12 + Math.random() * 12}px`,
                    opacity: 0.7 + i * 0.04,
                  }}
                />
              ))}
            </div>

            {/* Stop button */}
            <button
              onClick={stopVoice}
              className="mt-1 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95 shadow-md"
              style={{ background: "#ef4444" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
              </svg>
              Stop Recording
            </button>
          </div>
        </div>
        , document.body
      )}

      {/* CSS Keyframe animations injected via style tag */}
      <style>{`
        @keyframes micPulse {
          0%   { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── MAIN INPUT BOX ── */}
      <div
        className={`relative rounded-[1.5rem] md:rounded-[2rem] p-[1.5px] transition-all duration-700
          ${isPro
            ? "bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] shadow-[0_0_15px_rgba(252,246,186,0.3)] drop-shadow-[0_0_5px_rgba(191,149,63,0.2)]"
            : "glass-card border border-white/80 shadow-[0_8px_40px_rgba(0,0,0,0.06)]"
          }
        `}
      >
        <div className={`
          relative rounded-[calc(1.5rem-0.5px)] md:rounded-[calc(2rem-0.5px)] p-1.5 md:p-2 transition-all duration-300
          ${isPro
            ? "bg-white"
            : "bg-white/80 backdrop-blur-xl"
          }
          focus-within:shadow-[0_8px_32px_rgba(0,0,0,0.08)]
          ${isPro ? "focus-within:shadow-[0_0_20px_rgba(252,246,186,0.4)]" : "focus-within:bg-white"}
          flex flex-col gap-2
        `}>

          {/* TEXT INPUT */}
          <div className="px-4 pt-2 relative">
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={listening ? "🎙️ Listening… speak now" : "Message Bluebox"}
              rows={1}
              spellCheck="true"
              className="w-full bg-transparent outline-none text-slate-800 text-base md:text-lg font-medium placeholder-slate-400 resize-none max-h-[200px] py-1 md:py-1.5"
              style={listening ? { caretColor: "#ef4444" } : {}}
            />
          </div>

          {/* TOOLBAR */}
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex items-center gap-2">
              {/* Live News toggle */}
              <button
                onClick={() => setNews(!news)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all shadow-sm ${news
                  ? (isPro ? "bg-gradient-to-r from-[#BF953F] to-[#B38728] text-white" : "bg-[#4d6bfe] text-white shadow-[#4d6bfe]/20")
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M3.5 13.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5ZM15 7.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5ZM15 9.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5ZM15 11.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5ZM15 13.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5ZM12.5 5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5ZM10 5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5ZM7.5 5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5ZM5 5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5ZM3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v10A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-10ZM4.5 4a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5h-11Z" />
                </svg>
                Live News
              </button>

              {/* Search toggle */}
              <button
                onClick={() => setSearch(!search)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all shadow-sm ${search
                  ? (isPro ? "bg-gradient-to-r from-[#BF953F] to-[#B38728] text-white" : "bg-[#4d6bfe] text-white shadow-[#4d6bfe]/20")
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                Search
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* MIC BUTTON */}
              <button
                onClick={startVoice}
                title={listening ? "Stop recording" : "Voice input"}
                className={`relative p-2 rounded-full transition-all duration-200 ${
                  listening
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                }`}
              >
                {listening ? (
                  /* Animated "recording" dot in center when active */
                  <span className="flex items-center justify-center w-5 h-5">
                    <span className="w-3 h-3 rounded-sm bg-white" />
                  </span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                )}
                {/* Red pulsing dot indicator when recording */}
                {listening && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-red-500"
                    style={{ animation: "micPulse 1s ease-out infinite" }}
                  />
                )}
              </button>

              {/* SEND BUTTON */}
              <button
                onClick={send}
                disabled={!value.trim()}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${value.trim()
                  ? (isPro
                    ? "bg-gradient-to-br from-[#BF953F] to-[#B38728] text-white shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95"
                    : "bg-[#4d6bfe] text-white shadow-lg shadow-[#4d6bfe]/20 hover:scale-105 active:scale-95")
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
