"use client";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  MessageSquare,
  Download,
  ChevronUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, limit, orderBy } from "firebase/firestore";
import UsageChart from "./components/UsageChart";
import UserChatViewer from "./components/UserChatViewer";
import AllSessionsModal from "./components/AllSessionsModal";

export default function DashboardHome() {
  const [stats, setStats] = useState({
    earnings: "₹0",
    chats: "0",
    users: "0+",
    messages: "0"
  });

  const [activeUsers, setActiveUsers] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserMeta, setSelectedUserMeta] = useState(null);
  const [isAllSessionsOpen, setIsAllSessionsOpen] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const qPayments = query(collection(db, "payments"), orderBy("createdAt", "desc"));
        const paymentsSnap = await getDocs(qPayments);

        let totalEarnings = 0;
        const txs = [];

        paymentsSnap.forEach((doc) => {
          const data = doc.data();
          totalEarnings += Number(data.amount || 0);
          txs.push({
            id: doc.id,
            email: data.email || "Unknown",
            amount: data.amount,
            billingCycle: data.billingCycle,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });

        setRecentTransactions(txs.slice(0, 10));

        const chatsSnap = await getDocs(collection(db, "chats"));
        const totalChats = chatsSnap.size;

        let messageCount = 0;
        const userIds = new Set();
        const userDataMap = new Map();

        const messagePromises = chatsSnap.docs.map(async (doc) => {
          const chatData = doc.data();
          if (chatData.userId) {
            userIds.add(chatData.userId);
            if (chatData.userEmail || chatData.userName) {
              userDataMap.set(chatData.userId, {
                email: chatData.userEmail,
                name: chatData.userName,
                photoURL: chatData.userPhotoURL,
                lastActive: chatData.createdAt || chatData.updatedAt
              });
            }
          }

          const msgSnap = await getDocs(collection(db, "chats", doc.id, "messages"));
          return msgSnap.size;
        });

        const results = await Promise.all(messagePromises);
        messageCount = results.reduce((acc, curr) => acc + curr, 0);

        setStats({
          earnings: `₹${totalEarnings.toLocaleString()}`,
          chats: totalChats.toString(),
          users: userIds.size.toString() + "+",
          messages: messageCount.toString()
        });

        const usersArray = Array.from(userDataMap.entries()).map(([userId, data]) => ({
          id: userId,
          ...data
        }));
        usersArray.sort((a, b) => {
          const timeA = a.lastActive?.toMillis ? a.lastActive.toMillis() : 0;
          const timeB = b.lastActive?.toMillis ? b.lastActive.toMillis() : 0;
          return timeB - timeA;
        });
        setActiveUsers(usersArray);
      } catch (err) {
        console.error("Dashboard: Error fetching stats:", err);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: "Real Earnings", value: stats.earnings, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50", update: "Just now" },
    { label: "Total Users", value: stats.users || "0+", icon: Users, color: "text-emerald-500", bg: "bg-emerald-50", update: "Real-time" },
    { label: "Total Chats", value: stats.chats, icon: CheckCircle2, color: "text-indigo-600", bg: "bg-indigo-50", update: "Real-time" },
    { label: "Total Messages", value: stats.messages, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50", update: "Real-time" },
  ];

  const handleDownloadReport = async () => {
    try {
      const qPayments = query(collection(db, "payments"), orderBy("createdAt", "desc"));
      const paymentsSnap = await getDocs(qPayments);

      if (paymentsSnap.empty) {
        alert("No transaction data available to download.");
        return;
      }

      let csvContent = '"Transaction ID","User Email","Amount (INR)","Billing Cycle","Date","Time"\n';
      const esc = (val) => `"${String(val || "").replace(/"/g, '""')}"`;

      paymentsSnap.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.createdAt?.toDate() || new Date();
        const date = dateObj.toLocaleDateString('en-GB');
        const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        csvContent += `${esc(doc.id)},${esc(data.email)},${esc(data.amount)},${esc(data.billingCycle)},${esc(date)},${esc(time)}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Bluebox_Earnings_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export Error:", err);
      alert("Failed to export report.");
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumbs & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard Overview
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-2 font-medium">
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Admin</span>
            <span>/</span>
            <span className="text-indigo-600">Overview</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`p-6 bg-white border border-gray-200 rounded-2xl shadow-sm transition-all hover:shadow-md cursor-default`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                <card.icon size={22} strokeWidth={2.5} />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
                <h3 className="text-3xl font-bold text-gray-900 tabular-nums">{card.value}</h3>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pb-4 border-b border-gray-100">
              <div className={`h-8 flex items-end gap-1 opacity-40 ${card.color}`}>
                {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4].map((h, idx) => (
                  <div key={idx} className="w-1.5 bg-current rounded-t-sm" style={{ height: `${h * 100}%` }} />
                ))}
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">+12.5%</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mt-4">
              <Clock size={14} className="opacity-70" />
              <span>Tested &bull; {card.update}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Interaction Chart Area */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-center">
          <UsageChart />
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white flex flex-col border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-gray-100 bg-white">
            <div>
              <h4 className="text-lg font-bold text-gray-900">Recent Activity</h4>
              <p className="text-xs text-gray-500 mt-1 font-medium">Latest verified transactions</p>
            </div>
          </div>
          <div className="flex-1 divide-y divide-gray-100">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, i) => (
                <div key={tx.id || i} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tx.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Tier: PRO &bull; Cycle: {tx.billingCycle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-gray-900 tabular-nums">₹{tx.amount}</p>
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mt-1">Confirmed</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center">
                <p className="text-gray-400 text-sm font-medium">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Panel */}
        <div className="bg-white flex flex-col border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-white">
            <h4 className="text-lg font-bold text-gray-900">Status Panel</h4>
            <p className="text-xs text-gray-500 mt-1 font-medium">Live Session Monitor</p>
          </div>

          {/* User Stats Summary */}
          <div className="p-6 border-b border-gray-100 bg-indigo-50/50">
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Population</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-gray-900 tabular-nums leading-none tracking-tight">{stats.users || "0"}</p>
                <div className="flex flex-col pb-1">
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">Live ✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Users List Below Stats */}
          <div className="flex-1 p-2">
            <p className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Sessions</p>
            <div className="space-y-1">
              {activeUsers.length > 0 ? (
                <>
                  {activeUsers.slice(0, 5).map((user, i) => (
                    <div 
                      key={user.id || i} 
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSelectedUserMeta({ name: user.name, email: user.email });
                      }}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group mx-2"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden shrink-0 border border-gray-200">
                        <img
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=random`}
                          className="w-full h-full object-cover"
                          alt="User avatar"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user.name || user.email?.split('@')[0] || "User"}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                    </div>
                  ))}
                  {activeUsers.length > 5 && (
                    <div className="px-2 pt-1 pb-2">
                      <button 
                        onClick={() => setIsAllSessionsOpen(true)}
                        className="w-full py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all cursor-pointer"
                      >
                        View All Sessions ({activeUsers.length})
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                  <Users size={32} className="mb-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">No Active Sessions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Existing Chat History Modal */}
      {selectedUserId && (
        <UserChatViewer
          userId={selectedUserId}
          userName={selectedUserMeta?.name}
          userEmail={selectedUserMeta?.email}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* All Sessions Modal */}
      {isAllSessionsOpen && (
        <AllSessionsModal
          users={activeUsers}
          onClose={() => setIsAllSessionsOpen(false)}
          onSelectUser={(userId, userName, userEmail) => {
            setSelectedUserId(userId);
            setSelectedUserMeta({ name: userName, email: userEmail });
            setIsAllSessionsOpen(false);
          }}
        />
      )}
    </div>
  );
}
