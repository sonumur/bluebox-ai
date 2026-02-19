"use client";
import { useState, useRef } from "react";

export default function InputBar({ onSend, isPro }) {
  const [value, setValue] = useState("");
  const [blueboxThink, setBlueboxThink] = useState(false);
  const [search, setSearch] = useState(false);
  const [news, setNews] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const typoMap = {
    "teh": "the",
    "spaling": "spelling",
    "speling": "spelling",
    "currect": "correct",
    "mistach": "mistake",
    "mistak": "mistake",
    "beleive": "believe",
    "recieve": "receive",
    "definately": "definitely",
    "seperate": "separate",
    "alot": "a lot",
    "occured": "occurred",
    "happend": "happened",
    "realtime": "real-time",
    "googl": "google"
  };

  function autoCorrectText(text) {
    const words = text.split(/\s+/);
    const correctedWords = words.map(word => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, "");
      const correction = typoMap[cleanWord];
      if (correction) {
        // Preserving case for the first letter if it was capitalized
        if (word[0] === word[0].toUpperCase()) {
          return correction.charAt(0).toUpperCase() + correction.slice(1) + word.slice(cleanWord.length);
        }
        return correction + word.slice(cleanWord.length);
      }
      return word;
    });
    return correctedWords.join(" ");
  }

  function send() {
    if (!value.trim()) return;

    // Construct the message based on toggles
    let finalValue = autoCorrectText(value);
    if (blueboxThink) finalValue = `[BlueboxThink] ${finalValue}`;
    if (search) finalValue = `[Search] ${finalValue}`;
    if (news) finalValue = `[News] ${finalValue}`;

    onSend(finalValue);
    setValue("");
    setNews(false); // Reset news toggle after send
    setSearch(false);
    setBlueboxThink(false);
  }

  function startVoice() {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice input not supported in this browser");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setValue(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div className="w-full">
      <div
        className={`relative rounded-2xl md:rounded-[1.5rem] p-[1.5px] transition-all duration-700
          ${isPro
            ? "bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] shadow-[0_0_15px_rgba(252,246,186,0.3)] drop-shadow-[0_0_5px_rgba(191,149,63,0.2)]"
            : "bg-white/10 backdrop-blur-md"
          }
        `}
      >
        <div className={`
          relative rounded-[calc(1rem-0.5px)] md:rounded-[calc(1.5rem-0.5px)] p-1.5 md:p-2 transition-all duration-300
          ${isPro
            ? "bg-white"
            : "bg-white/60 backdrop-blur-md border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
          }
          focus-within:shadow-[0_8px_32px_rgba(0,0,0,0.08)] 
          ${isPro ? "focus-within:shadow-[0_0_20px_rgba(252,246,186,0.4)]" : "focus-within:border-gray-200"}
          flex flex-col gap-2 
        `}>
          {/* TEXT INPUT AREA */}
          <div className="px-4 pt-2 relative">
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message Bluebox"
              rows={1}
              spellCheck="true"
              className="w-full bg-transparent outline-none text-gray-800 text-base md:text-lg placeholder-gray-400 resize-none max-h-[200px] py-1 md:py-1.5"
            />
          </div>

          {/* TOOLBAR AREA */}
          <div className="flex items-center justify-between px-2 pb-1 relative">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNews(!news)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all shadow-sm ${news
                  ? (isPro ? "bg-gradient-to-r from-[#BF953F] to-[#B38728] text-white shadow-[#BF953F]/20" : "bg-[#4d6bfe] text-white shadow-[#4d6bfe]/20")
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M3.5 13.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5ZM15 7.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5ZM15 9.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5ZM15 11.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5ZM15 13.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5ZM12.5 5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5ZM10 5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5ZM7.5 5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5ZM5 5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5ZM3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v10A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-10ZM4.5 4a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5h-11Z" />
                </svg>
                Live News
              </button>

              <button
                onClick={() => setSearch(!search)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] md:text-xs font-semibold transition-all shadow-sm ${search
                  ? (isPro ? "bg-gradient-to-r from-[#BF953F] to-[#B38728] text-white shadow-[#BF953F]/20" : "bg-[#4d6bfe] text-white shadow-[#4d6bfe]/20")
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                Search
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startVoice}
                className={`p-2 rounded-full transition-colors ${listening ? "bg-red-50 text-red-500" : "text-gray-400 hover:bg-gray-100"}`}
                title="Voice Input"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </button>

              {/* SEND BUTTON */}
              <button
                onClick={send}
                disabled={!value.trim()}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${value.trim()
                  ? (isPro ? "bg-gradient-to-br from-[#BF953F] to-[#B38728] text-white shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95" : "bg-[#4d6bfe] text-white shadow-lg shadow-[#4d6bfe]/20 hover:scale-105 active:scale-95")
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
