import { useState } from "react";
import AuthBackground from "../components/AuthBackground.jsx";

export default function RegisterCompany({ navigate }) {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [branch, setBranch] = useState("");
  
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [simulatedEmailOtp, setSimulatedEmailOtp] = useState("");

  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [simulatedPhoneOtp, setSimulatedPhoneOtp] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const sendOtpCode = async (target, type) => {
    console.log("sendOtpCode invoked with target:", target, "type:", type);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, type: type })
      });
      console.log("sendOtpCode response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("sendOtpCode response data:", data);
        if (type === "email") {
          setEmailSent(true);
          setSimulatedEmailOtp(data.code);
        } else {
          setPhoneSent(true);
          setSimulatedPhoneOtp(data.code);
        }
      } else {
        setError("Error response from server.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to dispatch verification code.");
    }
  };

  const verifyOtpCode = async (target, code, type) => {
    console.log("verifyOtpCode invoked with target:", target, "code:", code, "type:", type);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, code: code })
      });
      console.log("verifyOtpCode response status:", res.status);
      if (res.ok) {
        if (type === "email") {
          setEmailVerified(true);
        } else {
          setPhoneVerified(true);
        }
      } else {
        setError("Invalid verification code or code expired.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!emailVerified || !phoneVerified) {
      setError("Email and Phone must be verified via OTP.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          company_name: companyName.trim(),
          industry: industry.trim(),
          branch: branch.trim()
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/"), 2500);
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
      <section className="login-card" style={{ maxWidth: "420px", padding: "20px 24px" }}>
        <h1>Register Tenant</h1>
        <p className="subtitle">Secure Organizational Setup</p>

        {error && <p className="field-error text-center">{error}</p>}
        {success && <p className="success text-center" style={{ color: "#d4af37", borderColor: "#d4af37" }}>Company registered successfully! Redirecting to login...</p>}

        <form onSubmit={handleRegister} className="space-y-2.5">
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#c4b5fd] uppercase tracking-wider block font-bold">1. Company Profile</span>
            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <div className="flex gap-2">
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
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-[#c4b5fd] uppercase tracking-wider block font-bold">2. Admin Identity</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Middle Name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-[#c4b5fd] uppercase tracking-wider block font-bold">3. Contact Verification</span>
            
            <div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Admin Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailVerified}
                  required
                />
                {!emailVerified && (
                  <button
                    type="button"
                    onClick={() => email ? sendOtpCode(email, "email") : setError("Enter admin email.")}
                    className="login-btn"
                    style={{ padding: "8px 12px", fontSize: "11px", whiteSpace: "nowrap", width: "auto", minWidth: "90px" }}
                  >
                    Send OTP
                  </button>
                )}
              </div>
              {emailSent && !emailVerified && (
                <div style={{ marginTop: "6px", padding: "6px", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", background: "rgba(212,175,55,0.05)" }}>
                  <span className="text-[10px] text-[#d4af37] block mb-1">Simulated Email OTP (Expires in 5m): {simulatedEmailOtp}</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Email OTP"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => verifyOtpCode(email, emailOtp, "email")}
                      className="login-btn"
                      style={{ padding: "8px 12px", width: "auto" }}
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}
              {emailVerified && <span className="text-xs text-green-400 font-bold block mt-1">✓ Admin Email Verified</span>}
            </div>

            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Admin Mobile Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={phoneVerified}
                  required
                />
                {!phoneVerified && (
                  <button
                    type="button"
                    onClick={() => phone ? sendOtpCode(phone, "phone") : setError("Enter mobile number.")}
                    className="login-btn"
                    style={{ padding: "8px 12px", fontSize: "11px", whiteSpace: "nowrap", width: "auto", minWidth: "90px" }}
                  >
                    Send SMS OTP
                  </button>
                )}
              </div>
              {phoneSent && !phoneVerified && (
                <div style={{ marginTop: "6px", padding: "6px", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "8px", background: "rgba(212,175,55,0.05)" }}>
                  <span className="text-[10px] text-[#d4af37] block mb-1">Simulated SMS OTP (Expires in 5m): {simulatedPhoneOtp}</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter SMS OTP"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => verifyOtpCode(phone, phoneOtp, "phone")}
                      className="login-btn"
                      style={{ padding: "8px 12px", width: "auto" }}
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}
              {phoneVerified && <span className="text-xs text-green-400 font-bold block mt-1">✓ Mobile Verified</span>}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-[#c4b5fd] uppercase tracking-wider block font-bold">4. Credentials</span>
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button 
            className="login-btn" 
            type="submit"
            disabled={!emailVerified || !phoneVerified}
            style={{ 
              marginTop: "12px", 
              background: (!emailVerified || !phoneVerified) ? "rgba(212,175,55,0.15)" : "linear-gradient(to right, #b45309, #d4af37)",
              color: (!emailVerified || !phoneVerified) ? "rgba(255,255,255,0.4)" : "#000000",
              border: (!emailVerified || !phoneVerified) ? "1px solid rgba(212,175,55,0.2)" : "none"
            }}
          >
            Create Profile & Tenant
          </button>
        </form>

        <div className="back-link" style={{ marginTop: "12px" }}>
          <button className="text-link" type="button" onClick={() => navigate("/")}>
            Back to Login
          </button>
        </div>
      </section>
    </AuthBackground>
  );
}
