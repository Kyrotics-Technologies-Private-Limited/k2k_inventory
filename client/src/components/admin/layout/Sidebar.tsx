import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  FiHome,
  FiPackage,
  FiShoppingBag,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
  FiBarChart2,
  FiFileText,
  FiList,
  FiUser,
  FiLogOut,
  FiChevronDown,
} from "react-icons/fi";
import { useAdmin } from "../../../context/AdminContext";
import { getAuth, signOut } from "firebase/auth";

interface MenuItem {
  path: string;
  icon: React.ReactNode;
  name: string;
}

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { pathname } = location;

  const { admin } = useAdmin();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !(dropdownRef.current as HTMLElement).contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth); // Firebase logout
      navigate("/admin-login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems: MenuItem[] = [
    { path: "/admin", icon: <FiHome size={20} />, name: "Dashboard" },
    {
      path: "/admin/categories",
      icon: <FiList size={20} />,
      name: "Categories",
    },
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
  ];

  const isItemActive = (itemPath: string) => {
    if (itemPath === "/admin") {
      return pathname === "/admin" || pathname === "/admin/" || pathname.startsWith("/admin/dashboard");
    }
    if (itemPath === "/admin/products") {
      return (
        pathname.startsWith("/admin/products") ||
        pathname.startsWith("/admin/variants")
      );
    }
    return pathname.startsWith(itemPath);
  };

  return (
    <div
      className={`h-screen bg-gray-800 text-white ${collapsed ? "w-16" : "w-64"
        } transition-all duration-300 relative flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
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
      <nav className="mt-4 flex-1 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={() =>
                  `group relative flex items-center p-3 mx-2 rounded transition-colors duration-200 ${isItemActive(item.path) ? "bg-blue-600" : "hover:bg-gray-700"
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

      {/* Admin Profile Avatar at the Bottom */}
      <div className="relative border-t border-gray-700 p-4 flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center w-full focus:outline-none hover:bg-gray-750 p-2 rounded-lg transition-all duration-200 group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0">
            {admin?.name?.charAt(0).toUpperCase() || "A"}
          </div>
          {!collapsed && (
            <>
              <div className="text-left ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {admin?.name || "Admin"}
                </p>
                <p className="text-xs font-medium text-gray-455 truncate mt-0.5">
                  {admin?.email}
                </p>
              </div>
              <FiChevronDown
                size={18}
                className={`text-gray-400 transition-transform duration-300 ml-2 flex-shrink-0 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            className={`absolute bottom-full mb-2 z-50 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ${
              collapsed ? "left-2" : "left-4"
            }`}
          >
            {/* Header info inside dropdown (only visible when collapsed since it is hidden in main button) */}
            {collapsed && (
              <div className="px-4 py-3 border-b border-gray-700 bg-gray-750">
                <p className="text-sm font-semibold text-white truncate">
                  {admin?.name || "Admin"}
                </p>
                <p className="text-xs font-medium text-gray-400 truncate mt-0.5">
                  {admin?.email}
                </p>
              </div>
            )}
            
            <div className="p-1.5">
              <a
                href="#"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-350 rounded-lg hover:bg-gray-700 hover:text-white transition"
              >
                <FiUser className="mr-3 text-gray-400 flex-shrink-0" /> Profile
              </a>
            </div>
            
            <div className="border-t border-gray-700 p-1.5 bg-gray-850">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-red-950/30 hover:text-red-300 transition"
              >
                <FiLogOut className="mr-3 text-red-400 flex-shrink-0" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
