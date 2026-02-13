"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

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

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/chat");
    } catch (error) {
      console.error("Login Error:", error);
      if (error.code !== "auth/cancelled-popup-request") {
        setErrorMsg(error.message);
      }
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#4d6bfe] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center font-sans text-gray-900 border-t-4 border-[#4d6bfe]">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center text-center">

        <div className="w-20 h-20 bg-[#4d6bfe]/10 text-[#4d6bfe] rounded-3xl flex items-center justify-center mb-8 animate-bounce transition-all duration-[3000ms]">
          <img src="/logo.svg" alt="Bluebox Logo" className="w-12 h-12" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
          Welcome to Bluebox
        </h1>
        <p className="text-gray-500 mb-10 text-[15px] max-w-[280px]">
          The next generation of AI reasoning and searching.
        </p>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-gray-200 rounded-2xl text-gray-700 font-semibold transition-all hover:shadow-md active:scale-[0.98] ${isSigningIn ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 hover:border-gray-300"
            }`}
        >
          {isSigningIn ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          )}
          {isSigningIn ? "Signing in..." : "Sign in with Google"}
        </button>

        {errorMsg && (
          <p className="mt-4 text-xs text-red-500 font-medium">{errorMsg}</p>
        )}

        <div className="mt-10 pt-10 border-t border-gray-50 w-full">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mb-4">
            Secured by Firebase
          </p>
          <div className="flex gap-4 justify-center text-[10px] text-gray-500 font-medium">
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Help</span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[12px] text-gray-400 font-medium">
          Bluebox can make mistakes. Please check important information.
        </p>
      </div>
    </div>
  );
}
