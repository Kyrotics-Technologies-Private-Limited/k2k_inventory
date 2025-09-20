import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  FiHome,
  FiPackage,
  FiShoppingBag,
  FiUsers,
  //FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiBarChart2,
  FiFileText,
} from "react-icons/fi";

interface MenuItem {
  path: string;
  icon: React.ReactNode;
  name: string;
}

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    { path: "/admin", icon: <FiHome size={20} />, name: "Dashboard" },
    {
      path: "/admin/products",
      icon: <FiPackage size={20} />,
      name: "Products",
    },
    {
      path: "/admin/orders",
      icon: <FiShoppingBag size={20} />,
      name: "Orders",
    },
    {
      path: "/admin/customers",
      icon: <FiUsers size={20} />,
      name: "Customers",
    },
    {
      path: "/admin/membership",
      icon: <FiUsers size={20} />,
      name: "Membership",
    },
    {
      path: "/admin/finance",
      icon: <FiBarChart2 size={20} />,
      name: "Finance Analysis",
    },
    {
      path: "/admin/product-analysis",
      icon: <FiBarChart2 size={20} />,
      name: "Product Analysis",
    },
    {
      path: "/admin/reports",
      icon: <FiFileText size={20} />,
      name: "Reports",
    },
    // {
    //   path: "/admin/settings",
    //   icon: <FiSettings size={20} />,
    //   name: "Settings",
    // },
  ];

  return (
    <div
      className={`h-screen bg-gray-800 text-white ${
        collapsed ? "w-16" : "w-64"
      } transition-all duration-300 relative`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && <h1 className="text-xl font-bold">Admin Panel</h1>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="button p-1 rounded hover:bg-gray-700"
        >
          {collapsed ? (
            <FiChevronRight size={20} />
          ) : (
            <FiChevronLeft size={20} />
          )}
        </button>
      </div>

      {/* Menu */}
      <nav className="mt-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end // This ensures exact match for the current route
                className={({ isActive }) =>
                  `group relative flex items-center p-3 mx-2 rounded transition-colors duration-200 ${
                    isActive ? "bg-blue-600" : "hover:bg-gray-700"
                  } ${collapsed ? "justify-center" : ""}`
                }
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.name}</span>}

                {/* Tooltip only when collapsed */}
                {collapsed && (
                  <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {item.name}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
