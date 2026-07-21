import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { API } from "../../services/api";
import { clearAuthSession } from "../../services/session";

function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem("token");
  const [session, setSession] = useState({ status: token ? "checking" : "anonymous", user: null });

  useEffect(() => {
    if (!token) return;

    let active = true;
    API.get("/auth/me")
      .then(({ data }) => {
        if (!active || !data.user) return;
        localStorage.setItem("user", JSON.stringify(data.user));
        setSession({ status: "authenticated", user: data.user });
      })
      .catch(() => {
        if (!active) return;
        clearAuthSession();
        setSession({ status: "anonymous", user: null });
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (session.status === "checking") {
    return (
      <div role="status" aria-live="polite" className="min-h-screen flex items-center justify-center text-slate-500">
        Verifying session...
      </div>
    );
  }

  if (session.status !== "authenticated" || !session.user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(session.user.role)) {
    const homeByRole = {
      user: "/user-dashboard",
      super_admin: "/super-admin-dashboard",
      admin: "/dashboard",
      staff: "/dashboard",
    };
    return <Navigate to={homeByRole[session.user.role] || "/login"} replace />;
  }

  return children;
}

export default ProtectedRoute;
