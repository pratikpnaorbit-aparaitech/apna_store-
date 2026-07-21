import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PUBLIC_API } from "../../services/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }
    try {
      setLoading(true);
      const { data } = await PUBLIC_API.post("/auth/forgot-password-otp", { email: normalizedEmail });
      setEmail(normalizedEmail);
      setOtpSent(true);
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otp) || newPassword.length < 6) {
      setError("Enter the 6-digit code and a password of at least 6 characters");
      return;
    }
    try {
      setLoading(true);
      await PUBLIC_API.post("/auth/reset-password", { email, otp, newPassword });
      alert("Password reset successfully. Please login.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400 outline-none";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-4">
      <div className="w-full max-w-md bg-white/95 rounded-3xl shadow-2xl p-8 border border-emerald-400">
        <h1 className="text-3xl font-bold text-gray-800 text-center">Forgot Password</h1>
        <p className="text-center text-gray-500 mt-2 mb-6">Reset it using the OTP sent to your email</p>

        {error && <div className="bg-red-100 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
        {message && <div className="bg-emerald-100 text-emerald-700 text-sm p-3 rounded-lg mb-4">{message}</div>}

        <form onSubmit={resetPassword} className="space-y-4">
          <input type="email" className={inputClass} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
          <button type="button" onClick={sendOtp} disabled={loading || !email} className="w-full bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white py-3 rounded-xl font-semibold">
            {otpSent ? "Resend OTP" : "Send OTP"}
          </button>

          {otpSent && (
            <>
              <input type="text" inputMode="numeric" className={inputClass} placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} required />
              <input type="password" className={inputClass} placeholder="New password (minimum 6 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} maxLength={128} required />
              <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-3 rounded-xl font-semibold">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </>
          )}
        </form>

        <button onClick={() => navigate("/login")} className="w-full mt-5 text-emerald-700 font-semibold text-sm">← Back to login</button>
      </div>
    </div>
  );
}
