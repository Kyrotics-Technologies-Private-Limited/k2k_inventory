import { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiUser, FiLogOut } from "react-icons/fi";
import { useAdmin } from "../../../context/AdminContext";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { admin } = useAdmin();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
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
      navigate("/admin-login"); // or your login route
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="flex items-center justify-between px-6 py-3">
        <div></div>
        <div className="flex items-center space-x-4">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 focus:outline-none group bg-white hover:bg-gray-50 p-2 rounded-lg transition-all duration-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">
                {admin?.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-800">
                  {admin?.name || "Admin"}
                </p>
                <p className="text-xs font-medium text-gray-500">
                  {admin?.email}
                </p>
              </div>
              <FiChevronDown
                size={18}
                className={`text-gray-500 transition-transform duration-300 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            <div
              className={`absolute right-0 z-20 w-64 mt-2 transform transition-all duration-200 ease-in-out ${
                dropdownOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              <div className="bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <p className="text-sm font-semibold text-gray-900">
                    {admin?.name}
                  </p>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">
                    {admin?.email}
                  </p>
                </div>
                <div className="border-t border-gray-100">
                  <div className="p-2">
                    <a
                      href="#"
                      className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <FiUser className="mr-3 text-gray-400" /> Profile
                    </a>
                  </div>
                </div>
                <div className="border-t border-gray-100 p-2 bg-gray-50">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <FiLogOut className="mr-3 text-red-500" />
                    Logout
                  </button>
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
