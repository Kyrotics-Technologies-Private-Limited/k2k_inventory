import { useState, useRef, useEffect } from "react";
import {
  FiBell,
  FiChevronDown,
  FiMenu,
  FiUser,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center">
          {/* <button className="button p-2 mr-3 text-gray-600 rounded-md hover:bg-gray-50 transition-colors">
            <FiMenu size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1> */}
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Bell with Badge */}
          <div className="relative">
            {/* <button className="button p-2 text-gray-500 rounded-full hover:bg-gray-50 transition-colors relative">
              <FiBell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button> */}
          </div>          {/* Admin Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="button flex items-center space-x-3 focus:outline-none group bg-white hover:bg-gray-50 p-2 rounded-lg transition-all duration-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
                <span className="text-white font-semibold text-sm">AD</span>
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">Admin User</p>
                <p className="text-xs font-medium text-gray-500 group-hover:text-gray-600">admin56</p>
              </div>
              <FiChevronDown
                size={18}
                className={`text-gray-500 transition-transform duration-300 ease-in-out group-hover:text-gray-700 ${
                  dropdownOpen ? "transform rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu with Animation */}
            <div
              className={`absolute right-0 z-20 w-64 mt-2 transform transition-all duration-200 ease-in-out ${
                dropdownOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              <div className="bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
                {/* Header Section */}
                <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <p className="text-sm font-semibold text-gray-900">
                    Admin User
                  </p>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">
                    admin56@gmail.com
                  </p>
                </div>

                {/* Menu Items */}
                <div className="border-t border-gray-100">
                  <div className="p-2">
                    <a
                      href="#"
                      className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150 group"
                    >
                      <FiUser className="mr-3 w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-150" />
                      Profile
                    </a>
                    {/* <a
                      href="#"
                      className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150 group"
                    >
                      <FiSettings className="mr-3 w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-150" />
                      Settings
                    </a> */}
                  </div>
                </div>

                {/* Logout Section */}
                <div className="border-t border-gray-100 p-2 bg-gray-50">
                  <a
                    href="#"
                    className="flex items-center px-4 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-150 group"                  >
                    <FiLogOut className="mr-3 w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors duration-150" />
                    <span>Logout</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
