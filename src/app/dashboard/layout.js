"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  Settings,
  LayoutDashboard,
  Users,
  BarChart3,
  Search,
  Maximize,
  LogOut,
  HelpCircle,
  Clock,
  Menu,
  X,
  ChevronUp
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && u.email === ADMIN_EMAIL) {
        setIsAuthorized(true);
        setIsCheckingAuth(false);
      } else if (u) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.push("/unauthorized");
      } else {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.push("/admin/login");
      }
    });
    return () => unsubscribe();
  }, [router, ADMIN_EMAIL]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = "BlueBox AI - Admin Panel";
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const navGroups = [
    {
      label: "Navigation",
      items: [
        { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: pathname === "/dashboard" },
      ]
    },
    {
      label: "AI Features",
      items: [
        { name: "Chat", icon: MessageSquare, href: "/dashboard/chat", active: pathname.startsWith("/dashboard/chat") },
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="flex h-screen bg-slate-50/50 text-slate-900 font-sans overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside className={`
        fixed inset-y-0 left-0 w-[260px] bg-white/80 backdrop-blur-2xl border-r border-slate-100 flex flex-col z-30
        transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <img src="/logo.svg" alt="Logo" className="w-5 h-5 brightness-0 invert" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              BlueBox<span className="text-indigo-600">.</span>ai
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-500 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-3 py-6 overflow-y-auto flex-1 border-b border-gray-100">
          <nav className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`
                        flex items-center group px-3 py-2.5 rounded-lg transition-all duration-200
                        ${item.active ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                      `}
                    >
                      <item.icon size={18} className={`${item.active ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"} transition-colors`} />
                      <span className="ml-3 text-sm">{item.name}</span>
                      {item.badge && (
                        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${item.badgeColor || "bg-indigo-100 text-indigo-700"}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-auto bg-white">
          <button className="flex items-center gap-3 text-gray-600 hover:bg-gray-50 transition-colors w-full py-4 px-6 group">
            <HelpCircle size={18} className="text-gray-400 group-hover:text-gray-600" />
            <span className="text-sm font-medium">Support Hub</span>
          </button>
          <div className="border-t border-gray-100">
            <div
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-700 rounded-full">
                <Users size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.displayName || "Administrator"}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {user?.email || "System Executive"}
                </p>
              </div>
              <div className={`transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}>
                <ChevronUp size={16} className="text-gray-400 group-hover:text-gray-600" />
              </div>
            </div>
            {isUserMenuOpen && (
              <div className="px-4 pb-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-10 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center flex-1 max-w-xl gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="relative w-full max-w-[320px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none text-sm transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-gray-600">
              <Clock size={14} />
              <span className="text-xs font-mono font-medium tracking-tight">
                {mounted ? formatTime(currentTime) : "00:00:00"}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-transparent relative">
          <div className="max-w-7xl mx-auto h-full box-border">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
