import { useEffect, useState } from "react";
import { API } from "../../services/api";
import {
  Users,
  Search,
  Phone,
  Calendar,
  ChevronRight,
  UserCircle,
  Mail
} from "lucide-react";

function RegisteredCustomers() {

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [stats, setStats] = useState({
    total: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {

      setLoading(true);

      const res = await API.get("/users/registered-users");

      const users = res.data || [];

      setCustomers(users);

      setStats({
        total: users.length
      });

    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Registered Users</h1>
          <p className="text-gray-500 mt-1">
            Users who registered in the application
          </p>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredCustomers.length} of {customers.length}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl shadow p-6 flex justify-between items-center">

          <div>
            <p className="text-sm opacity-80">Total Users</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>

          <Users className="w-10 h-10 opacity-80" />

        </div>

      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-xl shadow p-4">

        <div className="relative">

          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />

          <input
            type="text"
            placeholder="Search by name, mobile or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />

        </div>

      </div>

      {/* USERS LIST */}

      {loading ? (

        <div className="text-center py-16 text-gray-500">
          Loading registered users...
        </div>

      ) : filteredCustomers.length === 0 ? (

        <div className="text-center py-16 bg-white rounded-xl shadow">

          <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />

          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Users Found
          </h3>

          <p className="text-gray-500">
            {searchTerm
              ? "Try searching something else"
              : "No registered users available"}
          </p>

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {filteredCustomers.map((customer) => (

            <div
              key={customer._id}
              onClick={() => handleViewDetails(customer)}
              className="bg-white rounded-xl shadow hover:shadow-xl hover:-translate-y-1 transition cursor-pointer border"
            >

              <div className="p-6">

                {/* PROFILE */}
                <div className="flex items-center gap-3 mb-4">

                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">

                    {customer.name?.charAt(0).toUpperCase()}

                  </div>

                  <div>

                    <h3 className="font-semibold text-gray-800">
                      {customer.name}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {customer.email}
                    </p>

                  </div>

                  <ChevronRight className="ml-auto w-5 h-5 text-gray-400" />

                </div>

                {/* PHONE */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">

                  <Phone className="w-4 h-4" />

                  {customer.mobile}

                </div>

                {/* JOIN DATE */}

                <div className="flex items-center gap-2 text-sm text-gray-500">

                  <Calendar className="w-4 h-4" />

                  Joined {new Date(customer.createdAt).toLocaleDateString()}

                </div>

              </div>

            </div>

          ))}

        </div>

      )}

      {/* MODAL */}

      {showDetails && selectedCustomer && (

        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">

            {/* HEADER */}

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-xl font-bold">
                User Details
              </h2>

              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-700 text-lg"
              >
                ✕
              </button>

            </div>

            {/* PROFILE */}

            <div className="flex items-center gap-4 mb-6">

              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">

                {selectedCustomer.name?.charAt(0).toUpperCase()}

              </div>

              <div>

                <h3 className="text-lg font-semibold">
                  {selectedCustomer.name}
                </h3>

                <p className="text-gray-500">
                  {selectedCustomer.email}
                </p>

              </div>

            </div>

            {/* DETAILS */}

            <div className="space-y-4 text-sm">

              <div className="flex items-center gap-3">

                <Mail className="w-4 h-4 text-indigo-500" />

                {selectedCustomer.email}

              </div>

              <div className="flex items-center gap-3">

                <Phone className="w-4 h-4 text-indigo-500" />

                {selectedCustomer.mobile}

              </div>

              <div className="flex items-center gap-3">

                <Calendar className="w-4 h-4 text-indigo-500" />

                Joined on{" "}
                {new Date(selectedCustomer.createdAt).toLocaleDateString()}

              </div>

            </div>

            {/* FOOTER */}

            <div className="mt-8 flex justify-end">

              <button
                onClick={() => setShowDetails(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default RegisteredCustomers;