"use client";

import { useState, useEffect } from 'react';
import useAuth from '@/modules/auth/hooks/useAuth';
import { FirestoreUser } from '@/modules/auth/services/userService';

export default function AdminPage() {
  const { user, isAuthenticated, isChecking } = useAuth();
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (!isChecking && (!isAuthenticated || user?.role !== 'admin')) {
      window.location.href = '/';
    }
  }, [isAuthenticated, isChecking, user]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/users', {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await res.json();
        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user?.role === 'admin') {
      fetchUsers();
    }
  }, [isAuthenticated, user]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to update user role');
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      setSuccessMessage('User role updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-900 text-white p-8 rounded-lg max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex-1 p-6 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage users and their roles</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900 border border-green-700 text-green-200 px-6 py-4 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700 border-b border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Display Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Auth Provider
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Email Verified
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-white">
                        {u.displayName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {u.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.authProvider === 'spotify'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-blue-900 text-blue-300'
                        }`}>
                          {u.authProvider}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.emailVerified
                            ? 'bg-green-900 text-green-300'
                            : 'bg-yellow-900 text-yellow-300'
                        }`}>
                          {u.emailVerified ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as 'admin' | 'user')}
                          className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          disabled={user?.id === u.id}
                          className="text-blue-400 hover:text-blue-300 disabled:text-gray-500 transition-colors"
                          title={user?.id === u.id ? 'Cannot modify your own account' : 'Edit user'}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-white">{users.length}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Admin Users</h3>
            <p className="text-3xl font-bold text-blue-400">
              {users.filter(u => u.role === 'admin').length}
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Verified Users</h3>
            <p className="text-3xl font-bold text-green-400">
              {users.filter(u => u.emailVerified).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
