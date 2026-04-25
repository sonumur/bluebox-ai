"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        router.push("/chat");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (isSigningIn) return;
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/chat");
    } catch (error) {
      console.error("Email Auth Error:", error);
      setErrorMsg(error.message);
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/chat");
    } catch (error) {
      console.error("Login Error:", error);
      if (error.code !== "auth/cancelled-popup-request" && error.code !== "auth/popup-closed-by-user") {
        setErrorMsg(error.message);
      }
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center relative overflow-x-hidden overflow-y-auto py-12 px-4">
      {/* Rich Glassmorphic Mesh Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#f4f7ff]">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-indigo-500/40 via-purple-400/40 to-transparent blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-gradient-to-bl from-blue-500/40 via-cyan-400/40 to-transparent blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-400/30 blur-[100px] animate-pulse" style={{ animationDuration: '9s', animationDelay: '2s' }} />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'2\' cy=\'2\' r=\'1.5\' fill=\'rgba(0,0,100,0.04)\'/></svg>')] opacity-100 mix-blend-multiply" />
      </div>

      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2207409421620882"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm sm:max-w-md px-6 py-8 md:px-10 glass-card border-white/60 flex flex-col items-center justify-center text-center relative z-10 my-auto rounded-3xl md:rounded-[2.5rem] shadow-xl"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 md:mb-5 shadow-inner border border-indigo-100 shrink-0"
        >
          <img src="/logo.svg" alt="Bluebox Logo" className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md" />
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-1.5">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h1>
        <p className="text-slate-500 mb-5 text-sm md:text-[15px] font-medium max-w-[260px]">
          {isSignUp ? "Sign up to start using Bluebox AI." : "Sign in to continue to Bluebox AI."}
        </p>

        <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3 mb-5">
          <input 
            type="email" 
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 shadow-sm text-[15px]"
          />
          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 shadow-sm text-[15px]"
          />
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSigningIn}
            className={`w-full py-3.5 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md ${isSigningIn ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {isSigningIn ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
          </motion.button>
        </form>

        <div className="flex items-center w-full gap-3 mb-5 opacity-60">
          <div className="flex-1 h-px bg-slate-400"></div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Or</span>
          <div className="flex-1 h-px bg-slate-400"></div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className={`w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold transition-all shadow-sm hover:shadow-md ${isSigningIn ? "opacity-60 cursor-not-allowed" : "hover:border-indigo-200"}
            `}
        >
          {isSigningIn ? (
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          )}
          <span className="text-[15px]">
            Continue with Google
          </span>
        </motion.button>

        {errorMsg && (
          <p className="mt-4 text-[13px] text-red-500 font-semibold bg-red-50 border border-red-100 rounded-lg p-3 w-full animate-in fade-in zoom-in duration-300">
            {errorMsg.replace('Firebase:', '').replace('auth/', '')}
          </p>
        )}

        <div className="mt-5 w-full text-center">
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[13px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-6 md:mt-8 pt-5 md:pt-6 border-t border-slate-100 w-full">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-3">
            Secured by Firebase
          </p>
          <div className="flex gap-5 md:gap-8 justify-center text-[10px] md:text-[11px] text-slate-500 font-bold">
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Help</span>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center px-6 z-10"
      >
        <p className="text-[11px] text-slate-400 font-medium max-w-xs mx-auto">
          Bluebox can make mistakes. Please check important information.
        </p>
      </motion.div>
    </div>
  );
}
