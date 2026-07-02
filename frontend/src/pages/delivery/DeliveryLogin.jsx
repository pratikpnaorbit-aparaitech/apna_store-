import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaMotorcycle, FaEye, FaEyeSlash } from "react-icons/fa";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/delivery-partners/login", { phone, password });
      const { token, partner } = res.data;
      localStorage.setItem("dp_token", token);
      localStorage.setItem("dp_user", JSON.stringify(partner));
      window.location.href = "/delivery-dashboard";
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="bg-orange-500 p-3 rounded-xl text-white">
            <FaMotorcycle size={24} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Delivery Partner</h1>
        </div>
        <p className="text-center text-slate-400 text-sm mb-8">SmartStore Delivery App</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1 block">Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              required />
          </div>

          <div className="relative">
            <label className="text-sm font-semibold text-slate-600 mb-1 block">Password</label>
            <input type={showPassword ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              required />
            <span onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-10 cursor-pointer text-slate-400">
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-lg transition disabled:opacity-50">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Contact your admin if you don't have a password set
        </p>
      </div>
    </div>
  );
}