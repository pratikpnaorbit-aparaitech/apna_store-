import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { DELIVERY_API } from "../../services/api";
import { clearAuthSession } from "../../services/session";

export default function DeliveryProtectedRoute({ children }) {
  const token = localStorage.getItem("dp_token");
  const [status, setStatus] = useState(token ? "checking" : "anonymous");

  useEffect(() => {
    if (!token) return;

    let active = true;
    DELIVERY_API.get("/delivery-partners/me")
      .then(({ data }) => {
        if (!active || !data.partner) return;
        localStorage.setItem("dp_user", JSON.stringify(data.partner));
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        clearAuthSession();
        setStatus("anonymous");
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (status === "checking") {
    return (
      <div role="status" aria-live="polite" className="min-h-screen flex items-center justify-center text-slate-500">
        Verifying delivery session...
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login?role=delivery" replace />;
  }

  return children;
}
