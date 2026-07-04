import { useState } from "react";
import AuthBackground from "../components/AuthBackground.jsx";
import { getEmailError } from "../utils/validation.js";

export default function GoogleLogin({ navigate }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleNext = () => {
    const nextError = getEmailError(email);

    setError(nextError);

    if (nextError) {
      return;
    }

    localStorage.setItem("googleEmail", email.trim());
    navigate("/google-password");
  };

  return (
    <AuthBackground>
      <section className="google-card">
        <div className="google-wordmark">Google</div>

        <h2>Sign in</h2>
        <p>Use your Google Account</p>

        <input
          type="email"
          placeholder="Email or phone"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error)}
        />
        {error && <p className="google-error">{error}</p>}

        <div className="bottom">
          <button className="google-primary-btn" type="button" onClick={handleNext}>
            Next
          </button>
        </div>
      </section>
    </AuthBackground>
  );
}
