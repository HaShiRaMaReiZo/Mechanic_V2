'use client';

import { useEffect, useState } from 'react';
import { adminAPI, Payment, PaymentsResponse, User } from '@/lib/api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userIdFilter, setUserIdFilter] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [statusFilter, userIdFilter, pagination.page]);

  const loadUsers = async () => {
    try {
      const data = await adminAPI.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter) params.status = statusFilter;
      if (userIdFilter) params.userId = userIdFilter;

      const data = await adminAPI.getPayments(params);
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (paymentId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'paid' : 'pending';
    if (!confirm(`Mark payment as ${newStatus}?`)) return;

    try {
      await adminAPI.updatePaymentStatus(paymentId, {
        paymentStatus: newStatus as 'pending' | 'paid',
        paidDate: newStatus === 'paid' ? new Date().toISOString() : undefined,
      });
      loadPayments();
    } catch (error) {
      alert('Failed to update payment status');
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
        <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage mechanic payment records and status
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mechanic</label>
            <select
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All</option>
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
        <div className="text-center py-12 text-gray-500">No payments found</div>
      ) : (
        <>
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
                    Paid Date
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleUpdateStatus(payment.paymentId, payment.paymentStatus)}
                        className={`${
                          payment.paymentStatus === 'pending'
                            ? 'text-green-600 hover:text-green-900'
                            : 'text-yellow-600 hover:text-yellow-900'
                        }`}
                      >
                        {payment.paymentStatus === 'pending' ? 'Mark as Paid' : 'Mark as Pending'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-2 border rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 border rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

