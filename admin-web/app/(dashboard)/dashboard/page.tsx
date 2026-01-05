'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI, DashboardStats } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12 text-red-600">Failed to load statistics</div>;
  }

  const statCards = [
    {
      name: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: '⏳',
      color: 'bg-yellow-500',
      href: '/services?status=pending',
    },
    {
      name: 'Services This Week',
      value: stats.weekServices,
      icon: '📊',
      color: 'bg-blue-500',
      href: '/services',
    },
    {
      name: 'Week Total Amount',
      value: `${stats.weekTotal.toLocaleString()} MMK`,
      icon: '💰',
      color: 'bg-green-500',
      href: '/weekly-summary',
    },
    {
      name: 'Pending Payments',
      value: stats.pendingPayments,
      icon: '💳',
      color: 'bg-purple-500',
      href: '/payments?status=pending',
    },
    {
      name: 'All Services',
      value: stats.allServices,
      icon: '🔧',
      color: 'bg-indigo-500',
      href: '/services',
    },
    {
      name: 'All Time Total',
      value: `${stats.allTotal.toLocaleString()} MMK`,
      icon: '💵',
      color: 'bg-teal-500',
      href: '/services',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of maintenance services and payments
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Link
            key={card.name}
            href={card.href}
            className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 hover:shadow-lg transition-shadow"
          >
            <dt>
              <div className={`absolute rounded-md ${card.color} p-3`}>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{card.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </dd>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/services?status=pending"
            className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-medium text-gray-900">Review Pending Services</h3>
            <p className="mt-2 text-sm text-gray-600">
              {stats.pendingReviews} services waiting for review
            </p>
          </Link>
          <Link
            href="/payments?status=pending"
            className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-medium text-gray-900">Process Payments</h3>
            <p className="mt-2 text-sm text-gray-600">
              {stats.pendingPayments} payments pending
            </p>
          </Link>
          <Link
            href="/weekly-summary"
            className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-medium text-gray-900">View Weekly Summary</h3>
            <p className="mt-2 text-sm text-gray-600">
              {stats.weekServices} services this week
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

