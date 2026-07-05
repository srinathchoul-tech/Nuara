import { useState } from "react";
import AuthBackground from "../components/AuthBackground.jsx";

export default function RegisterCompany({ navigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [branch, setBranch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !firstName || !lastName || !companyName || !branch) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/register-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company_name: companyName.trim(),
          industry: industry.trim(),
          branch: branch.trim()
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/"), 2000);
      } else {
        const errData = await res.json();
        setError(errData.detail || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection failure.");
    }
  };

  return (
    <AuthBackground>
      <section className="login-card">
        <h1>Register Tenant</h1>
        <p className="subtitle">Setup Company Admin Profile</p>

        {error && <p className="field-error text-center">{error}</p>}
        {success && <p className="success text-center">Company registered successfully! Redirecting...</p>}

        <form onSubmit={handleRegister} className="space-y-2">
          <input
            type="text"
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
          <input
            type="text"
            placeholder="Primary Branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            required
          />

          <div style={{ borderTop: "1px solid rgba(219,191,255,0.2)", margin: "10px 0" }}></div>

          <input
            type="text"
            placeholder="Admin First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Admin Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="login-btn" type="submit">
            Create Profile & Tenant
          </button>
        </form>

        <div className="back-link">
          <button className="text-link" type="button" onClick={() => navigate("/")}>
            Back to Login
          </button>
        </div>
      </section>
    </AuthBackground>
  );
}
