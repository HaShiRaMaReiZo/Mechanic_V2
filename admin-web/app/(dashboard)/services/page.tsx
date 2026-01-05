'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI, Service, ServicesResponse, User } from '@/lib/api';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userIdFilter, setUserIdFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadServices();
  }, [statusFilter, userIdFilter, searchTerm, startDate, endDate, pagination.page]);

  const loadUsers = async () => {
    try {
      const data = await adminAPI.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter) params.status = statusFilter;
      if (userIdFilter) params.userId = userIdFilter;
      if (searchTerm) params.search = searchTerm;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await adminAPI.getServices(params);
      setServices(data.services);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (maintId: number) => {
    if (!confirm('Approve this service?')) return;
    try {
      await adminAPI.approveService(maintId);
      loadServices();
    } catch (error) {
      alert('Failed to approve service');
    }
  };

  const handleReject = async (maintId: number) => {
    const notes = prompt('Enter rejection notes:');
    if (notes === null) return;
    try {
      await adminAPI.rejectService(maintId, notes);
      loadServices();
    } catch (error) {
      alert('Failed to reject service');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || ''}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Services Review</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review and manage maintenance service submissions
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Code or ID"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Services Table */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No services found</div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {services.map((service) => (
                <li key={service.maintId}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {service.imageUrl && (
                          <img
                            src={service.imageUrl}
                            alt="Service"
                            className="h-16 w-16 object-cover rounded mr-4"
                          />
                        )}
                        <div>
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              Service #{service.maintId}
                            </p>
                            {getStatusBadge(service.reviewStatus)}
                          </div>
                          <p className="text-sm text-gray-500">
                            {service.maintenanceCode || 'N/A'} • {service.mechanicName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(service.dateImplemented).toLocaleDateString()} • {service.actualMaintCost.toLocaleString()} MMK
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/services/${service.maintId}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          View
                        </Link>
                        {service.reviewStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(service.maintId)}
                              className="text-green-600 hover:text-green-900 text-sm font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(service.maintId)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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

