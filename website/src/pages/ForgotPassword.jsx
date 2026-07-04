import { useState } from "react";
import AuthBackground from "../components/AuthBackground.jsx";
import { getEmailError } from "../utils/validation.js";

export default function ForgotPassword({ navigate }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendResetLink = () => {
    const nextError = getEmailError(email);

    setError(nextError);

    if (nextError) {
      return;
    }

    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setSent(true);
    }, 900);
  };

  return (
    <AuthBackground>
      <section className="login-card">
        <h1>Forgot Password?</h1>

        <p className="reset-copy">
          Enter your email address and we'll send you a password reset link.
        </p>

        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
            setSent(false);
          }}
          aria-invalid={Boolean(error)}
          required
        />
        {error && <p className="field-error">{error}</p>}

        <button
          className="login-btn"
          type="button"
          onClick={sendResetLink}
          disabled={isSending}
        >
          {isSending ? "Sending..." : "Send Reset Link"}
        </button>

        {sent && (
          <div className="success">
            If an account exists for {email.trim()}, a password reset link has been sent.
            <br />
            Check your inbox and spam folder.
          </div>
        )}

        <div className="back-link">
          <button className="text-link" type="button" onClick={() => navigate("/")}>
            Back to Login
          </button>
        </div>
      </section>
    </AuthBackground>
  );
}
