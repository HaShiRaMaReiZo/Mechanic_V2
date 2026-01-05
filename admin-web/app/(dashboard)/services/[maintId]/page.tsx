'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminAPI, Service } from '@/lib/api';
import Image from 'next/image';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const maintId = parseInt(params.maintId as string);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    loadService();
  }, [maintId]);

  const loadService = async () => {
    try {
      const data = await adminAPI.getService(maintId);
      setService(data);
    } catch (error) {
      console.error('Failed to load service:', error);
      alert('Service not found');
      router.push('/services');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this service?')) return;
    try {
      await adminAPI.approveService(maintId);
      loadService();
    } catch (error) {
      alert('Failed to approve service');
    }
  };

  const handleReject = async () => {
    const notes = prompt('Enter rejection notes:');
    if (notes === null) return;
    try {
      await adminAPI.rejectService(maintId, notes);
      loadService();
    } catch (error) {
      alert('Failed to reject service');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this service? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteService(maintId);
      router.push('/services');
    } catch (error) {
      alert('Failed to delete service');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!service) {
    return <div className="text-center py-12 text-red-600">Service not found</div>;
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${styles[status as keyof typeof styles] || ''}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-900 mb-4"
        >
          ← Back to Services
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service #{service.maintId}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {service.maintenanceCode || 'N/A'} • {service.mechanicName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(service.reviewStatus)}
            {service.reviewStatus === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Service Details</h2>
          <dl className="grid grid-cols-1 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Date Implemented</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(service.dateImplemented).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Mileage</dt>
              <dd className="mt-1 text-sm text-gray-900">{service.mileage || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {service.actualMaintCost.toLocaleString()} MMK
              </dd>
            </div>
          </dl>

          <h3 className="text-lg font-semibold mt-6 mb-4">Service Breakdown</h3>
          <dl className="space-y-3">
            {service.engineOilRefilled ? (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Engine Oil Refilled</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {service.engineOilCost?.toLocaleString() || '0'} MMK
                </dd>
              </div>
            ) : null}
            {service.chainTightened ? (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Chain Tightened</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {service.chainTightenedCost?.toLocaleString() || '0'} MMK
                </dd>
              </div>
            ) : null}
            {service.chainSprocketChanged ? (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Chain Sprocket Changed</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {service.chainSprocketChangedCost?.toLocaleString() || '0'} MMK
                </dd>
              </div>
            ) : null}
            {service.otherMaintServices ? (
              <div>
                <dt className="text-sm text-gray-600 mb-1">Other Services</dt>
                <dd className="text-sm text-gray-900">{service.otherMaintServices}</dd>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {service.otherMaintServicesCost?.toLocaleString() || '0'} MMK
                </dd>
              </div>
            ) : null}
          </dl>

          {service.reviewNotes && (
            <div className="mt-6">
              <dt className="text-sm font-medium text-gray-500">Review Notes</dt>
              <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                {service.reviewNotes}
              </dd>
            </div>
          )}
        </div>

        {/* Image */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Service Image</h2>
          {service.imageUrl ? (
            <div>
              <img
                src={service.imageUrl}
                alt="Service"
                className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90"
                onClick={() => setImageModalOpen(true)}
              />
              {imageModalOpen && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                  onClick={() => setImageModalOpen(false)}
                >
                  <img
                    src={service.imageUrl!}
                    alt="Service"
                    className="max-w-4xl max-h-full"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No image available</div>
          )}
        </div>
      </div>
    </div>
  );
}

