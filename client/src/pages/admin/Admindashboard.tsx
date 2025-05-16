import {
  FiDollarSign,
  FiShoppingCart,
  FiUser,
  FiTrendingUp,
} from "react-icons/fi";

const AdminDashboard = () => {
  const stats = [
    {
      title: "Total Revenue",
      value: "$12,345",
      icon: <FiDollarSign size={24} />,
      change: "+12% from last month",
    },
    {
      title: "Total Orders",
      value: "1,234",
      icon: <FiShoppingCart size={24} />,
      change: "+8% from last month",
    },
    {
      title: "Customers",
      value: "892",
      icon: <FiUser size={24} />,
      change: "+5% from last month",
    },
    {
      title: "Conversion Rate",
      value: "3.2%",
      icon: <FiTrendingUp size={24} />,
      change: "+0.8% from last month",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between">
              <div>
                <p className="text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
                <p className="text-sm text-green-500 mt-1">{stat.change}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <p>Recent orders and activities will appear here...</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
