import { useState } from "react";
import AuthBackground from "../components/AuthBackground.jsx";
import { getEmailError, getPasswordError } from "../utils/validation.js";

export default function MainLogin({ navigate, onLoginSuccess }) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError("");
    setLoading(true);

    const nextErrors = {
      email: getEmailError(email),
      password: getPasswordError(password)
    };

    if (!companyName.trim()) {
      nextErrors.companyName = "Company Name is required.";
    }

    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password || nextErrors.companyName) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/company-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          company_name: companyName.trim(),
          role: role
        })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("loggedUser", email.trim());
        localStorage.setItem("loginRole", data.session.role);
        localStorage.setItem("companyName", data.session.company_name);
        onLoginSuccess(email.trim(), data.session.role);
      } else {
        const errData = await res.json();
        setApiError(errData.detail || "Authentication failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setApiError("Connection failure. Make sure the server is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <section className="login-card">
        <h1>Nuara</h1>
        <p className="subtitle">Sign in to continue</p>

        {apiError && <p className="field-error text-center" style={{ marginBottom: "16px" }}>{apiError}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Company Name"
            value={companyName}
            onChange={(event) => {
              setCompanyName(event.target.value);
              setErrors((current) => ({ ...current, companyName: "" }));
            }}
            aria-invalid={Boolean(errors.companyName)}
            required
          />
          {errors.companyName && <p className="field-error">{errors.companyName}</p>}

          <label className="role-label" htmlFor="loginRole">
            LOGIN AS
          </label>
          <div className="select-wrap">
            <select
              id="loginRole"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: "" }));
            }}
            aria-invalid={Boolean(errors.email)}
            required
          />
          {errors.email && <p className="field-error">{errors.email}</p>}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: "" }));
            }}
            aria-invalid={Boolean(errors.password)}
            required
          />
          {errors.password && <p className="field-error">{errors.password}</p>}

          <button 
            className="login-btn" 
            type="submit" 
            style={{ marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <div className="flex gap-4 justify-between mt-4 text-[13px]">
          <button
            className="text-link"
            type="button"
            onClick={() => navigate("/register-company")}
          >
            🏢 Register Company
          </button>
          <button
            className="text-link"
            type="button"
            style={{ color: "#c4b5fd" }}
            onClick={() => navigate("/employee-signup")}
          >
            👥 Employee Signup
          </button>
        </div>
      </section>
    </AuthBackground>
  );
}
