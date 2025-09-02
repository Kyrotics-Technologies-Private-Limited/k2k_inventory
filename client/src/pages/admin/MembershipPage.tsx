import React, { useState, useEffect } from "react";
import { membershipApi } from "../../services/api/membershipApi";
import type { Membership, CreateMembershipInput } from "../../types/MembershipSettings";

const MembershipPage: React.FC = () => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [formData, setFormData] = useState<CreateMembershipInput>({
    type: "",
    description: "",
    price: 0,
    duration: 1,
    discountPercentage: 0
  });

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      const data = await membershipApi.getMemberships();
      setMemberships(data);
    } catch (error) {
      console.error("Failed to fetch memberships:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'duration' || name === 'discountPercentage' 
        ? Number(value) 
        : value
    }));
  };

  const resetForm = () => {
    setFormData({
      type: "",
      description: "",
      price: 0,
      duration: 1,
      discountPercentage: 0
    });
    setEditingMembership(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type.trim() || formData.price <= 0 || formData.duration <= 0) {
      alert("Please fill all required fields correctly.");
      return;
    }

    try {
      if (editingMembership) {
        await membershipApi.updateMembership(editingMembership.id, formData);
        alert("Membership updated successfully!");
      } else {
        await membershipApi.createMembership(formData);
        alert("Membership created successfully!");
      }
      
      resetForm();
      fetchMemberships();
    } catch (error) {
      alert(editingMembership ? "Failed to update membership." : "Failed to create membership.");
      console.error("Error:", error);
    }
  };

  const handleEdit = (membership: Membership) => {
    setEditingMembership(membership);
    setFormData({
      type: membership.type,
      description: membership.description,
      price: membership.price,
      duration: membership.duration,
      discountPercentage: membership.discountPercentage
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this membership?")) {
      try {
        await membershipApi.deleteMembership(id);
        alert("Membership deleted successfully!");
        fetchMemberships();
      } catch (error) {
        alert("Failed to delete membership.");
        console.error("Error:", error);
      }
    }
  };

  const getDurationText = (duration: number) => {
    if (duration === 1) return "1 month";
    if (duration < 12) return `${duration} months`;
    const years = duration / 12;
    return years === 1 ? "1 year" : `${years} years`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Membership Management</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowAddForm(true)}
        >
          {editingMembership ? "Edit Membership" : "Add Plan"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">
            {editingMembership ? "Edit Membership" : "Add New Membership"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Membership Type *
                </label>
                <input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  placeholder="e.g., Basic, Premium, VIP"
                  className="w-full border px-3 py-2 rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="299"
                  className="w-full border px-3 py-2 rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (months) *
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="1"
                  className="w-full border px-3 py-2 rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage (%) *
                </label>
                <input
                  type="number"
                  name="discountPercentage"
                  value={formData.discountPercentage}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  placeholder="15"
                  className="w-full border px-3 py-2 rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the benefits of this membership..."
                rows={3}
                className="w-full border px-3 py-2 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {editingMembership ? "Update" : "Create"}
              </button>
              <button
                type="button"
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Membership Plans</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading memberships...</p>
          </div>
        ) : memberships.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No memberships found. Create your first membership plan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {memberships.map((membership) => (
                  <tr key={membership.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {membership.type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {membership.description || "No description"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{membership.price}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getDurationText(membership.duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {membership.discountPercentage}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(membership)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(membership.id)}
                          className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembershipPage;
