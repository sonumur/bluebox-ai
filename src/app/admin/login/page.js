"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "../../../lib/firebase";
import { signInWithPopup, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.email === ADMIN_EMAIL) {
                // Admin is already logged in, redirect to dashboard
                router.push("/dashboard");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router, ADMIN_EMAIL]);

    const handleEmailSignIn = async (e) => {
        e.preventDefault();
        if (isSigningIn) return;
        setIsSigningIn(true);
        setErrorMsg(null);
        try {
            if (email !== ADMIN_EMAIL) {
                setErrorMsg("Access denied. Admin credentials required.");
                setIsSigningIn(false);
                return;
            }
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/dashboard");
        } catch (error) {
            console.error("Admin Login Error:", error);
            setErrorMsg(error.message);
            setIsSigningIn(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (isSigningIn) return;
        setIsSigningIn(true);
        setErrorMsg(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);

            // Check if user is admin
            if (result.user.email === ADMIN_EMAIL) {
                router.push("/dashboard");
            } else {
                setErrorMsg("Access denied. Only authorized administrators can login here.");
                setIsSigningIn(false);
            }
        } catch (error) {
            console.error("Admin Login Error:", error);
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

                {/* Admin Badge */}
                <div className="w-20 h-20 bg-[#4d6bfe]/10 text-[#4d6bfe] rounded-3xl flex items-center justify-center mb-8 relative">
                    <img src="/logo.svg" alt="Bluebox Logo" className="w-12 h-12" />
                    <div className="absolute -top-2 -right-2 bg-[#4d6bfe] text-white text-[9px] font-bold px-2 py-1 rounded-full">
                        ADMIN
                    </div>
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                    Admin Panel Login
                </h1>
                <p className="text-gray-500 mb-10 text-[15px] max-w-[280px]">
                    Secure access for authorized administrators only.
                </p>

                {/* Email Sign-In Form */}
                <form onSubmit={handleEmailSignIn} className="w-full flex flex-col gap-4 mb-6">
                    <input 
                        type="email" 
                        placeholder="Admin Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800"
                    />
                    <input 
                        type="password" 
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800"
                    />
                    <button
                        type="submit"
                        disabled={isSigningIn}
                        className={`w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${isSigningIn ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-700"}`}
                    >
                        {isSigningIn && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {isSigningIn ? "Verifying Keys..." : "Secure Login"}
                    </button>
                </form>

                <div className="flex items-center w-full gap-3 mb-6 opacity-60">
                    <div className="flex-1 h-px bg-slate-300"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or</span>
                    <div className="flex-1 h-px bg-slate-300"></div>
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    type="button"
                    className={`w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold transition-all hover:shadow-md hover:border-indigo-200 ${isSigningIn ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                    Continue with Google
                </button>

                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl w-full">
                        <p className="text-[13px] text-red-600 font-semibold">{errorMsg.replace('Firebase:', '').replace('auth/', '')}</p>
                    </div>
                )}

                <div className="mt-10 pt-10 border-t border-gray-50 w-full">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mb-4">
                        🔒 Secured Access
                    </p>
                    <a
                        href="/"
                        className="text-[11px] text-[#4d6bfe] font-medium hover:underline"
                    >
                        ← Back to regular login
                    </a>
                </div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-[12px] text-gray-400 font-medium">
                    Bluebox AI - Admin Dashboard
                </p>
            </div>
        </div>
    );
}
