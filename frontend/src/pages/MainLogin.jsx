import { useState } from "react";
import AuthBackground from "../components/AuthBackground.jsx";
import { getEmailError, getPasswordError } from "../utils/validation.js";

export default function MainLogin({ navigate, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [errors, setErrors] = useState({});

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {
      email: getEmailError(email),
      password: getPasswordError(password)
    };

    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) {
      return;
    }

    localStorage.setItem("loggedUser", email.trim());
    localStorage.setItem("loginRole", role);
    onLoginSuccess(email.trim(), role);
  };

  return (
    <AuthBackground>
      <section className="login-card">
        <h1>Nuara</h1>
        <p className="subtitle">Sign in to continue</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px", padding: "10px", borderRadius: "10px", border: "1px solid rgba(219, 191, 255, 0.15)", background: "rgba(24, 12, 40, 0.3)" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "#c4b5fd", textAlign: "center", marginBottom: "4px" }}>Quick Demo Access</div>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => {
                setEmail("engineer@nexusbrain.com");
                setPassword("password123");
                setRole("EMPLOYEE");
              }}
              style={{ padding: "4px 8px", background: "rgba(168, 85, 247, 0.2)", border: "1px solid rgba(219, 191, 255, 0.3)", borderRadius: "6px", fontSize: "11px", color: "#ffffff", cursor: "pointer", transition: "all 0.2s" }}
            >
              💻 Engineer
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("hr@nexusbrain.com");
                setPassword("password123");
                setRole("HR");
              }}
              style={{ padding: "4px 8px", background: "rgba(168, 85, 247, 0.2)", border: "1px solid rgba(219, 191, 255, 0.3)", borderRadius: "6px", fontSize: "11px", color: "#ffffff", cursor: "pointer", transition: "all 0.2s" }}
            >
              👥 HR Manager
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("ceo@nexusbrain.com");
                setPassword("password123");
                setRole("CEO");
              }}
              style={{ padding: "4px 8px", background: "rgba(168, 85, 247, 0.2)", border: "1px solid rgba(219, 191, 255, 0.3)", borderRadius: "6px", fontSize: "11px", color: "#ffffff", cursor: "pointer", transition: "all 0.2s" }}
            >
              👑 Executive
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
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
              <option value="HR">HR</option>
              <option value="CEO">CEO</option>
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

          <div className="forgot">
            <button
              className="text-link"
              type="button"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot Password?
            </button>
          </div>

          <button className="login-btn" type="submit">
            Login
          </button>
        </form>

        <div className="divider">OR</div>

        <button
          className="google-btn"
          type="button"
          onClick={() => navigate("/google-login")}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            width="20"
            height="20"
            alt=""
          />
          Continue with Google
        </button>

        <button
          className="signup-btn"
          type="button"
          onClick={() => navigate("/google-login")}
        >
          Sign up
        </button>
      </section>
    </AuthBackground>
  );
}
