'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Services', href: '/services', icon: '🔧' },
    { name: 'Weekly Summary', href: '/weekly-summary', icon: '📅' },
    { name: 'Payments', href: '/payments', icon: '💰' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          <div className="border-t border-gray-800 p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
            >
              <span className="mr-3">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            ☰
          </button>
          <div className="flex-1"></div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

