'use client';

import { useEffect, useState } from 'react';
import { adminAPI, Payment, User } from '@/lib/api';

export default function WeeklySummaryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    loadUsers();
    // Set default to current week
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setSelectedWeek(monday.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      loadWeeklySummary();
    }
  }, [selectedWeek, selectedUserId]);

  const loadUsers = async () => {
    try {
      const data = await adminAPI.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadWeeklySummary = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getWeeklySummary(
        selectedWeek,
        selectedUserId ? parseInt(selectedUserId) : undefined
      );
      setPayments(data);
    } catch (error) {
      console.error('Failed to load weekly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'paid' ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Paid
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Weekly Summary</h1>
        <p className="mt-2 text-sm text-gray-600">
          View weekly service summaries and payment status
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Week Start Date</label>
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mechanic</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All Mechanics</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No payments found for this week</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mechanic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Services
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.paymentId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.username}
                    </div>
                    {(payment.first_name || payment.last_name) && (
                      <div className="text-sm text-gray-500">
                        {payment.first_name} {payment.last_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(payment.weekStartDate).toLocaleDateString()} - {new Date(payment.weekEndDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.serviceCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.totalAmount.toLocaleString()} MMK
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.paymentStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a
                      href={`/payments?paymentId=${payment.paymentId}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

