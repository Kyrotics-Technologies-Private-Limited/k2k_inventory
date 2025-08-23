import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const FinanceAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Placeholder for future data fetches
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance Analysis</h1>
        {/* <button
          onClick={() => navigate("/admin")}
          className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded hover:border-blue-400"
        >
          ← Back to Dashboard
        </button> */}
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between h-36">
          <p className="text-gray-500">Monthly Revenue</p>
          <p className="text-2xl font-bold mt-1">{loading ? "Loading..." : "—"}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between h-36">
          <p className="text-gray-500">Monthly Orders</p>
          <p className="text-2xl font-bold mt-1">{loading ? "Loading..." : "—"}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-between h-36">
          <p className="text-gray-500">Average Order Value</p>
          <p className="text-2xl font-bold mt-1">{loading ? "Loading..." : "—"}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Trends</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">Chart </div>
      </div>
    </div>
  );
};

export default FinanceAnalysis;


