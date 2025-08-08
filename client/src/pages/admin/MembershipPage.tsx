import React, { useState, useEffect } from "react";
import { membershipApi } from "../../services/api/membershipApi";

interface Membership {
  id: string;
  type: string;
  description: string;
}

const MembershipPage: React.FC = () => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    const fetchMemberships = async () => {
      setLoading(true);
      const data = await membershipApi.getMemberships();
      setMemberships(data);
      setLoading(false);
    };
    fetchMemberships();
  }, []);

  const handleAddMembership = async () => {
    if (!newType.trim()) return;
    try {
      const newMembership = await membershipApi.createMembership({ type: newType, description: newDescription });
      setMemberships([...memberships, newMembership]);
      setShowAddForm(false);
      setNewType("");
      setNewDescription("");
    } catch (error) {
      alert("Failed to add membership.");
    }
  };

  const handleDeleteMembership = async (id: string) => {
    try {
      await membershipApi.deleteMembership(id);
      setMemberships(memberships.filter(m => m.id !== id));
    } catch (error) {
      alert("Failed to delete membership.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Memberships</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowAddForm(true)}
        >
          Add Membership
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Add New Membership</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Membership Type"
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-2"
            />
            <textarea
              placeholder="Description"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-2"
            />
            <div className="flex space-x-2">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                onClick={handleAddMembership}
              >
                Save
              </button>
              <button
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Type of Membership</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-gray-500">Loading...</td>
              </tr>
            ) : memberships.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-gray-500">No memberships added yet.</td>
              </tr>
            ) : (
              memberships.map(m => (
                <tr key={m.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{m.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      onClick={() => alert(`Viewing membership: ${m.type}`)}
                    >
                      View
                    </button>
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      onClick={() => handleDeleteMembership(m.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MembershipPage;
