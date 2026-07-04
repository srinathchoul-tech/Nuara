import { useMemo, useState } from "react";
import AuthBackground from "../components/AuthBackground.jsx";
import { getPasswordError } from "../utils/validation.js";

export default function GooglePassword({ onLoginSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const email = useMemo(() => localStorage.getItem("googleEmail") || "", []);

  const handleLogin = () => {
    const nextError = getPasswordError(password);

    setError(nextError);

    if (nextError) {
      return;
    }

    localStorage.setItem("loggedUser", email);
    onLoginSuccess(email, "EMPLOYEE");
  };

  return (
    <AuthBackground>
      <section className="google-card">
        <h2>Welcome</h2>

        <div className="google-email">{email}</div>

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error)}
        />
        {error && <p className="google-error">{error}</p>}

        <div className="bottom">
          <button className="google-primary-btn" type="button" onClick={handleLogin}>
            Next
          </button>
        </div>
      </section>
    </AuthBackground>
  );
}
