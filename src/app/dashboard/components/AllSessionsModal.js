"use client";
import { X, Users, ChevronRight } from "lucide-react";

export default function AllSessionsModal({ users, onClose, onSelectUser }) {
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-none">All Active Sessions</h3>
              <p className="text-sm text-gray-500 mt-1">{users.length} connected users</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No active sessions found.</p>
            </div>
          ) : (
            users.map((user, i) => (
              <div 
                key={user.id || i}
                onClick={() => onSelectUser(user.id, user.name, user.email)}
                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-100 hover:shadow-sm hover:bg-indigo-50/50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden shrink-0 border border-gray-200 shadow-sm">
                    <img
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=random`}
                      className="w-full h-full object-cover"
                      alt="User avatar"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-900 transition-colors">
                      {user.name || user.email?.split('@')[0] || "User"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col flex-end items-end gap-2 text-indigo-400 group-hover:text-indigo-600 transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md self-end whitespace-nowrap">Online Check</span>
                  <ChevronRight size={18} />
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
