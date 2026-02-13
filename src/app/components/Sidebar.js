"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Sidebar({ isOpen, onClose, onSelectChat, onNewChat, activeChatId }) {
    const [chats, setChats] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setChats([]);
            return;
        }

        const q = query(
            collection(db, "chats"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChats(chatList);
        });

        return () => unsubscribe();
    }, [user]);

    const handleSignOut = async () => {
        if (!confirm("Sign out of Bluebox?")) return;
        try {
            await auth.signOut();
            window.location.href = "/";
        } catch (err) {
            console.error("Sign Out Error:", err);
        }
    };

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={onClose}
                />
            )}

            <div className={`
        fixed inset-y-0 left-0 z-50 flex h-full transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:relative
      `}>

                {/* Chat List Container */}
                <div className="w-60 bg-[#f9f9f9] border-r border-[#e5e5e5] flex flex-col">
                    {/* New Chat Button */}
                    <div className="p-4">
                        <button
                            onClick={() => {
                                onNewChat();
                                if (window.innerWidth < 768) onClose();
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl transition-all border border-[#e5e5e5] shadow-sm font-medium text-sm group"
                        >
                            <div className="flex items-center gap-2.5">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#4d6bfe]">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>New chat</span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform group-hover:rotate-12">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                        </button>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto px-3 py-2">
                        {chats.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 grayscale py-12">
                                <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-400 mb-2 animate-spin duration-[10s]" />
                                <p className="text-xs text-gray-500 font-medium">No chat history</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {chats.map(chat => (
                                    <div
                                        key={chat.id}
                                        onClick={() => {
                                            onSelectChat(chat.id);
                                            if (window.innerWidth < 768) onClose();
                                        }}
                                        className={`
                      group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm
                      ${activeChatId === chat.id ? "bg-[#eef1ff] text-[#4d6bfe] font-medium" : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"}
                    `}
                                    >
                                        <div className="truncate flex-1">
                                            {chat.title || "New Chat"}
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Delete this chat?")) {
                                                    deleteDoc(doc(db, "chats", chat.id)).catch(console.error);
                                                    if (activeChatId === chat.id) onNewChat();
                                                }
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                                            title="Delete"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* User Info (Footer) */}
                    <div className="p-4 border-t border-[#e5e5e5] bg-[#f9f9f9]">
                        <div
                            onClick={handleSignOut}
                            className="flex items-center gap-3 group cursor-pointer hover:bg-red-50 p-2 rounded-xl transition-all"
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 border border-gray-200">
                                <img
                                    src={user?.photoURL || 'https://ui-avatars.com/api/?name=' + (user?.displayName || user?.email || 'User') + '&background=random'}
                                    alt="User"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 truncate">
                                <div className="text-sm font-medium text-gray-800 truncate">
                                    {user?.displayName || user?.email?.split('@')[0] || "Sign out"}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate group-hover:text-red-400">
                                    Click to sign out
                                </div>
                            </div>
                            <div className="text-gray-400 group-hover:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
