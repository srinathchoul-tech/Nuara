import { useEffect, useState } from "react";
import AuthBackground from "../components/AuthBackground.jsx";

export default function EmployeeSignup({ navigate }) {
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState([]);
  
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [branch, setBranch] = useState("");
  
  const [companyName, setCompanyName] = useState("");
  
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
  const [signupComplete, setSignupComplete] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/companies");
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCompanies();
  }, []);

  const sendOtpCode = async (target, type) => {
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, type: type })
      });
      if (res.ok) {
        const data = await res.json();
        if (type === "email") {
          setEmailSent(true);
          setSimulatedEmailOtp(data.code);
        } else {
          setPhoneSent(true);
          setSimulatedPhoneOtp(data.code);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to dispatch verification code.");
    }
  };

  const verifyOtpCode = async (target, code, type) => {
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, code: code })
      });
      if (res.ok) {
        if (type === "email") {
          setEmailVerified(true);
        } else {
          setPhoneVerified(true);
        }
      } else {
        setError("Invalid verification code.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/employee-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          first_name: firstName.trim(),
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          company_name: companyName,
          branch: branch.trim()
        })
      });

      if (res.ok) {
        setSignupComplete(true);
        setTimeout(() => navigate("/"), 4000);
      } else {
        const errData = await res.json();
        setError(errData.detail || "Signup request failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection failure.");
    }
  };

  return (
    <AuthBackground>
      <section className="login-card" style={{ padding: "20px 24px" }}>
        <h1>Employee Signup</h1>
        <p className="subtitle">Step {step} of 4: Setup Profile</p>

        {error && <p className="field-error text-center">{error}</p>}
        {signupComplete && (
          <div className="success text-center" style={{ background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#10b981", padding: "12px", borderRadius: "10px" }}>
            <strong>Registration Request Pending</strong>
            <p style={{ fontSize: "11px", marginTop: "4px" }}>Your profile has been saved. Please contact your company administrator to verify and approve your account.</p>
          </div>
        )}

        {!signupComplete && (
          <div style={{ marginTop: "12px" }}>
            {step === 1 && (
              <div className="space-y-3">
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
                <button
                  type="button"
                  onClick={() => firstName && lastName ? setStep(2) : setError("First & Last Name are required.")}
                  className="login-btn"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[#c4b5fd] uppercase block mb-1 font-bold">Select Organization</label>
                  <select
                    className="w-full bg-[#180c28] border border-outline rounded-xl p-2 text-xs text-white"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  >
                    <option value="">-- Choose Company --</option>
                    {companies.map((c, idx) => (
                      <option key={idx} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Work Branch Office"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  required
                />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setStep(1)} className="signup-btn" style={{ margin: 0 }}>Back</button>
                  <button
                    type="button"
                    onClick={() => companyName && branch ? setStep(3) : setError("Select company and workspace branch.")}
                    className="login-btn"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[#c4b5fd] uppercase block mb-1 font-bold">Email Address</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={emailVerified}
                    />
                    {!emailVerified && (
                      <button
                        type="button"
                        onClick={() => email ? sendOtpCode(email, "email") : setError("Enter email")}
                        className="login-btn"
                        style={{ padding: "8px 12px", fontSize: "11px", width: "auto", minWidth: "90px" }}
                      >
                        Send Code
                      </button>
                    )}
                  </div>
                  {emailSent && !emailVerified && (
                    <div style={{ marginTop: "6px" }}>
                      <span className="text-[10px] text-green-400 block mb-1">Simulated OTP: {simulatedEmailOtp}</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Verification Code"
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
                  {emailVerified && <span className="text-xs text-green-400 font-bold block mt-1">✓ Email Verified</span>}
                </div>

                <div>
                  <label className="text-[10px] text-[#c4b5fd] uppercase block mb-1 font-bold">Phone Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={phoneVerified}
                    />
                    {!phoneVerified && (
                      <button
                        type="button"
                        onClick={() => phone ? sendOtpCode(phone, "phone") : setError("Enter phone")}
                        className="login-btn"
                        style={{ padding: "8px 12px", fontSize: "11px", width: "auto", minWidth: "90px" }}
                      >
                        Send Code
                      </button>
                    )}
                  </div>
                  {phoneSent && !phoneVerified && (
                    <div style={{ marginTop: "6px" }}>
                      <span className="text-[10px] text-green-400 block mb-1">Simulated OTP: {simulatedPhoneOtp}</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Verification Code"
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
                  {phoneVerified && <span className="text-xs text-green-400 font-bold block mt-1">✓ Phone Verified</span>}
                </div>

                <div className="flex gap-4" style={{ marginTop: "12px" }}>
                  <button type="button" onClick={() => setStep(2)} className="signup-btn" style={{ margin: 0 }}>Back</button>
                  <button
                    type="button"
                    onClick={() => emailVerified && phoneVerified ? setStep(4) : setError("Verify email and phone via OTP code.")}
                    className="login-btn"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <form onSubmit={handleSignup} className="space-y-3">
                <input
                  type="password"
                  placeholder="Password"
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
                <div className="flex gap-4">
                  <button type="button" onClick={() => setStep(3)} className="signup-btn" style={{ margin: 0 }}>Back</button>
                  <button type="submit" className="login-btn">
                    Submit Request
                  </button>
                </div>
              </form>
            )}
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
