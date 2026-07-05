import React, { useState, useEffect, useRef } from "react";
import MainLogin from "./pages/MainLogin.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import GoogleLogin from "./pages/GoogleLogin.jsx";
import GooglePassword from "./pages/GooglePassword.jsx";
import RegisterCompany from "./pages/RegisterCompany.jsx";
import EmployeeSignup from "./pages/EmployeeSignup.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import "./styles.css";

const API_BASE = "http://127.0.0.1:8000/api";

function App() {
  const [session, setSession] = useState({
    user_id: "Node_02",
    role: "Standard_Eng",
    clearance: "ENG",
    is_locked: false
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [ledgerWidth, setLedgerWidth] = useState(360);

  const [expandedFolders, setExpandedFolders] = useState({
    drives: true,
    wikis: false,
    tickets: false,
    chats: true
  });

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const [dbDocs, setDbDocs] = useState([]);
  const [newDoc, setNewDoc] = useState({
    name: "",
    content: "",
    source_type: "Drive",
    access_level: "PUBLIC",
    url: ""
  });
  const [gapAnalysis, setGapAnalysis] = useState([]);
  const [theme, setTheme] = useState("dark");
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("loggedUser"));
  const [authRoute, setAuthRoute] = useState(() => window.location.hash.replace("#", "") || "/");
  const [ingestOutput, setIngestOutput] = useState(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [activeOrchestrationTool, setActiveOrchestrationTool] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [reviewDraft, setReviewDraft] = useState(null);
  const [dnaTimeline, setDnaTimeline] = useState(null);

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotMessages, setCopilotMessages] = useState([
    { sender: "system", text: "Hello! I am the Lead Technical Architect of NexusBrain. Ask me anything about our architecture, security permissions, or tech stack." }
  ]);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const copilotEndRef = useRef(null);

  const logEndRef = useRef(null);

  const fetchSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/session`);
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      const data = await res.json();
      setLogs(data.reverse());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingMembers = async () => {
    const compName = localStorage.getItem("companyName") || "Nuara";
    try {
      const res = await fetch(`${API_BASE}/admin/pending-members?company_name=${compName}`);
      if (res.ok) {
        const data = await res.json();
        setPendingMembers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveMember = async (memberEmail) => {
    const role = selectedRoles[memberEmail] || "Standard_Eng";
    try {
      const res = await fetch(`${API_BASE}/admin/approve-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail, assigned_role: role })
      });
      if (res.ok) {
        fetchPendingMembers();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const resDocs = await fetch(`${API_BASE}/admin/documents`);
      if (resDocs.ok) {
        const dataDocs = await resDocs.json();
        setDbDocs(Array.isArray(dataDocs) ? dataDocs : []);
      } else {
        setDbDocs([]);
      }

      const resGaps = await fetch(`${API_BASE}/admin/gap-analysis`);
      if (resGaps.ok) {
        const dataGaps = await resGaps.json();
        setGapAnalysis(dataGaps.gaps || []);
      }
    } catch (err) {
      console.error(err);
      setDbDocs([]);
    }
  };

  const handleQuery = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      
      if (data.status === "breach") {
        setSession(prev => ({ ...prev, is_locked: true }));
        setResults(data);
      } else {
        setResults(data);
      }
      fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${API_BASE}/reset`);
      await fetchSession();
      setResults(null);
      setQuery("");
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileClick = (docId) => {
    if (session.is_locked) return;

    const documentItem = dbDocs.find(d => d.id === docId);
    if (!documentItem) return;

    const docClearance = documentItem.access_level;
    const clearances = { "PUBLIC": 0, "ENG": 1, "HR": 2, "EXEC": 3 };
    const userClearanceVal = clearances[session.clearance] || 0;
    const docClearanceVal = clearances[docClearance] || 0;

    if (userClearanceVal < docClearanceVal) {
      setQuery(`ACCESS_DENIED: Requesting node ${documentItem.name}`);
      handleQuerySimulatedBreach(documentItem);
    } else {
      setSelectedDoc(documentItem);
    }
  };

  const handleQuerySimulatedBreach = async (documentItem) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `RESOLVE ENTITY: ${documentItem.name}` })
      });
      const data = await res.json();
      setSession(prev => ({ ...prev, is_locked: true }));
      setResults(data);
      fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!newDoc.name || !newDoc.content) return;
    setIngestLoading(true);
    setIngestOutput(null);

    try {
      const res = await fetch(`${API_BASE}/admin/ingest-simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDoc.name,
          content: newDoc.content,
          source_type: newDoc.source_type,
          access_level: newDoc.access_level
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIngestOutput(data);
        setNewDoc({
          name: "",
          content: "",
          source_type: "Drive",
          access_level: "PUBLIC",
          url: ""
        });
        fetchAdminData();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIngestLoading(false);
    }
  };

  const handleUpdatePermission = async (docId, newLevel) => {
    try {
      const res = await fetch(`${API_BASE}/admin/documents/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, access_level: newLevel })
      });
      if (res.ok) {
        fetchAdminData();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startResizeSidebar = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => {
      const newWidth = Math.max(180, Math.min(320, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const startResizeLedger = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => {
      const newWidth = Math.max(280, Math.min(540, window.innerWidth - moveEvent.clientX));
      setLedgerWidth(newWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const fetchOnboardingChats = async () => {
    try {
      const res = await fetch(`${API_BASE}/onboarding/chats`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setCopilotMessages(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      setAuthRoute(window.location.hash.replace("#", "") || "/");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleLoginSuccess = async (email, role) => {
    setIsAuthenticated(true);
    window.location.hash = "";
    try {
      await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role })
      });
      fetchSession();
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchLogs();
    fetchAdminData();
    fetchOnboardingChats();
    const interval = setInterval(fetchLogs, 3000);

    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showSettings) {
      fetchAdminData();
      fetchPendingMembers();
    }
  }, [showSettings]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    if (copilotEndRef.current) {
      copilotEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [copilotMessages, copilotLoading]);

  const getSuggestionChips = (role) => {
    const r = role ? role.toLowerCase() : "";
    if (r === "surgeon" || r === "medical clerk") {
      return [
        { label: "📁 EHR Records", query: "Show patient treatment history for EHR #302" },
        { label: "💳 Insurance Gaps", query: "What claims are missing code mapping tags?" },
        { label: "🛏️ Bed Audits", query: "Show logs for outpatient capacity planning" }
      ];
    } else if (r === "officer") {
      return [
        { label: "📜 Search Warrants", query: "Show evidence files matching precinct C search warrant" },
        { label: "🚨 Case Correlation", query: "Are there matching suspects in other theft cases?" },
        { label: "⚖️ FIR Logs", query: "Draft FIR for Sarah Connor case #1029" }
      ];
    } else {
      return [
        { label: "🔐 Security Model", query: "How does data security work?" },
        { label: "🛠️ Tech Stack", query: "What is the core tech stack?" },
        { label: "👥 User Roles", query: "How many roles are in this website?" }
      ];
    }
  };

  const handleCopilotSendSimulated = async (queryText) => {
    if (!queryText.trim()) return;

    setCopilotMessages(prev => [...prev, { sender: "user", text: queryText }]);
    setCopilotLoading(true);

    const r = session.role ? session.role.toLowerCase() : "";
    const selectedTool = r === "surgeon" || r === "medical clerk"
      ? "Medical Coder Tool"
      : r === "officer"
        ? "FIR Generator Tool"
        : "Sprint Planner Tool";

    setActiveOrchestrationTool(selectedTool);
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const res = await fetch(`${API_BASE}/onboarding/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText })
      });
      if (res.ok) {
        const data = await res.json();
        let finalResponse = data.response;
        if (r === "surgeon" || r === "medical clerk") {
          finalResponse += `\n\nCitations: [EHR_Patient_302.docx](file:///c:/Vynedam_2k26/backend/database.db), [Billing_Guidelines_v1.docx](file:///c:/Vynedam_2k26/backend/database.db)`;
        } else if (r === "officer") {
          finalResponse += `\n\nCitations: [Theft_FIR_1029.pdf](file:///c:/Vynedam_2k26/backend/database.db), [Precinct_Scanner_Log.csv](file:///c:/Vynedam_2k26/backend/database.db)`;
        } else {
          finalResponse += `\n\nCitations: [Architecture_v2.docx](file:///c:/Vynedam_2k26/backend/database.db), [#eng_leads](file:///c:/Vynedam_2k26/backend/database.db)`;
        }
        setCopilotMessages(prev => [...prev, { sender: "system", text: finalResponse }]);
      } else {
        setCopilotMessages(prev => [...prev, { sender: "system", text: "Error: Copilot gateway unreachable." }]);
      }
    } catch (err) {
      console.error(err);
      setCopilotMessages(prev => [...prev, { sender: "system", text: "Connection error. Please try again." }]);
    } finally {
      setCopilotLoading(false);
      setActiveOrchestrationTool(null);
    }
  };

  const handleCopilotSend = async (e) => {
    if (e) e.preventDefault();
    if (!copilotInput.trim()) return;
    const msg = copilotInput;
    setCopilotInput("");
    await handleCopilotSendSimulated(msg);
  };

  const selectDocumentQuery = (docName, queryText) => {
    setQuery(queryText);
  };

  const getProfileAvatarSymbol = (clearance) => {
    if (clearance === "EXEC") return "admin_panel_settings";
    if (clearance === "HR") return "badge";
    return "engineering";
  };

  const getProfileBadgeColor = (clearance) => {
    if (clearance === "EXEC") return "bg-rose-500 text-white";
    if (clearance === "HR") return "bg-amber-500 text-white";
    return "bg-primary text-on-primary";
  };

  if (!isAuthenticated) {
    if (authRoute === "/forgot-password") {
      return <ForgotPassword navigate={(r) => window.location.hash = r} />;
    }
    if (authRoute === "/register-company") {
      return <RegisterCompany navigate={(r) => window.location.hash = r} />;
    }
    if (authRoute === "/employee-signup") {
      return <EmployeeSignup navigate={(r) => window.location.hash = r} />;
    }
    return <MainLogin navigate={(r) => window.location.hash = r} onLoginSuccess={handleLoginSuccess} />;
  }

  const handleLogout = () => {
    localStorage.removeItem("loggedUser");
    localStorage.removeItem("loginRole");
    localStorage.removeItem("companyName");
    setIsAuthenticated(false);
    setSession({
      user_id: "",
      role: "",
      clearance: "",
      is_locked: false
    });
  };

  if (session.role === "ADMIN" || localStorage.getItem("loginRole") === "ADMIN") {
    return <AdminDashboard onLogout={handleLogout} />;
  }


  const getVaultLabel = (key, role) => {
    const r = role ? role.toLowerCase() : "";
    if (r === "surgeon" || r === "medical clerk") {
      if (key === "drives") return "Patient Records (EHR)";
      if (key === "wikis") return "Insurance Databases";
      if (key === "tickets") return "Bed Management Logs";
      return "Medical Chat Logs";
    } else if (r === "officer") {
      if (key === "drives") return "Case Files";
      if (key === "wikis") return "FIR Records";
      if (key === "tickets") return "Evidence Logs";
      return "Precinct Chat Logs";
    } else {
      if (key === "drives") return "Drives";
      if (key === "wikis") return "Wikis";
      if (key === "tickets") return "Tickets";
      return "Chat Logs";
    }
  };

  const getVaultLabels = (role) => {
    const r = role ? role.toLowerCase() : "";
    if (r === "surgeon" || r === "medical clerk") {
      return ["Patient Records (EHR)", "Insurance Databases", "Bed Management Logs"];
    } else if (r === "officer") {
      return ["Case Files", "FIR Records", "Evidence Logs"];
    } else {
      return ["Github Repos", "Jira Tickets", "Slack Logs"];
    }
  };

  const getNeuralInsights = (role) => {
    const r = role ? role.toLowerCase() : "";
    if (r === "surgeon" || r === "medical clerk") {
      return [
        { title: "EHR Billing Notice", message: "Patient John Doe's bypass claim #302 is missing diagnosis code. Draft an inquiry?" },
        { title: "Capacity Alert", message: "Outpatient surgery queue expected to peak at Main Branch on Monday. Adjust staff levels?" }
      ];
    } else if (r === "officer") {
      return [
        { title: "MO Correlation Match", message: "Alert: Similar theft MO detected in case from 2022. Compare scanner reports?" },
        { title: "Precinct Log Variance", message: "Notice: Evidence log variance detected in Precinct Branch B records." }
      ];
    } else {
      return [
        { title: "Sprint Outdated Wiki", message: "Project Alpha hit a milestone in Jira, but the Wiki is outdated. Generate summary?" },
        { title: "Security Alert", message: "Warning: Potential credential exposure in slack_#eng_leads logs. Initiate trace?" }
      ];
    }
  };

  const getPendingActions = (role) => {
    const r = role ? role.toLowerCase() : "";
    if (r === "surgeon" || r === "medical clerk") {
      return [
        {
          id: "act_hc_1",
          title: "Draft Medical Billing Summary",
          description: "Detailed treatment billing for EHR bypass surgery Patient X.",
          draft: "Diagnosis code: I25.10. Procedure code: 33510. Total billing: $48,200. Prepared for Main Branch insurance desk approval.",
          tool: "Medical Coder Tool"
        }
      ];
    } else if (r === "officer") {
      return [
        {
          id: "act_pol_1",
          title: "Draft FIR Form for Case #1029",
          description: "First Information Report document details for Precinct B theft.",
          draft: "FIR under section 154 CrPC. Complainant: Sarah Connor. Accused: Unknown. Offense: Asset theft.",
          tool: "FIR Generator Tool"
        }
      ];
    } else {
      return [
        {
          id: "act_tech_1",
          title: "Draft Technical Spec for RAG",
          description: "Architectural spec sheet mapping tenant-level retrieval gateways.",
          draft: "Specification Document: RAG Isolation Gateway. Security filters enforce strict company checks.",
          tool: "Sprint Planner Tool"
        }
      ];
    }
  };

  const handleExecuteAction = (action) => {
    setActiveOrchestrationTool(action.tool);
    setTimeout(() => {
      setActiveOrchestrationTool(null);
      alert(`Action successfully verified and executed via ${action.tool}!`);
    }, 1800);
  };

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-body-sm relative select-none bg-background text-on-surface transition-colors duration-200 ${session.is_locked ? "selection:bg-error selection:text-on-error" : "selection:bg-primary-container selection:text-on-primary-container"}`}>
      {session.is_locked && <div className="crt-overlay"></div>}

      <header className="bg-[var(--header-bg)] border-b border-outline px-6 h-16 w-full z-50 shrink-0 flex justify-between items-center text-[#dec9e9] transition-colors duration-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className="text-[#dec9e9] hover:text-white p-1.5 rounded-md hover:bg-surface-variant transition-colors flex items-center justify-center cursor-pointer"
            title="Toggle Left Sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <span className="text-[15px] font-bold tracking-widest text-[#dec9e9] uppercase">NUARA</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase text-slate-400 font-mono-data">Tenant:</span>
            <span className="text-xs font-bold text-white px-2 py-0.5 border border-[#d4af37]/30 rounded bg-purple-950/20 font-mono-data text-[#d4af37]">
              {localStorage.getItem("companyName") || "Nuara"}
            </span>
          </div>

          <button
            onClick={() => setDnaTimeline(true)}
            className="px-3 py-1.5 bg-[#6247aa]/40 hover:bg-[#7251b5] border border-[#d4af37]/30 rounded-lg text-xs font-bold text-[#d4af37] transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            Project DNA Onboarding
          </button>

          <div className="h-4 w-px bg-outline/40"></div>

          <div className="flex items-center gap-3 border border-outline bg-surface-variant/30 px-3 py-1.5 rounded-xl text-[12px] relative group font-semibold">
            <span className="material-symbols-outlined text-[18px] text-[#dec9e9]">
              {getProfileAvatarSymbol(session.clearance)}
            </span>
            <span className="text-[#dec9e9]">{localStorage.getItem("loggedUser") || "User"}</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${getProfileBadgeColor(session.clearance)}`}>
              {session.role || "EMPLOYEE"}
            </span>
            <button
              onClick={handleLogout}
              className="text-[#dec9e9] hover:text-white hover:bg-[#7251b5] transition-colors p-1.5 rounded-md flex items-center justify-center cursor-pointer active:scale-95 ml-1"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {isLeftSidebarOpen && (
          <nav 
            style={{ width: `${sidebarWidth}px` }} 
            className="bg-surface border-r border-outline flex flex-col h-full z-40 shrink-0"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant font-bold px-2">Data Vault</div>
              <ul className="space-y-1">
                <li className="flex flex-col">
                  <div 
                    onClick={() => toggleFolder("drives")}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-variant transition-all ${expandedFolders.drives ? "text-primary font-medium" : "text-on-surface-variant"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        {expandedFolders.drives ? "folder_open" : "folder"}
                      </span>
                      <span className="text-[13px]">{getVaultLabel("drives", session.role)}</span>
                    </div>
                  </div>
                  {expandedFolders.drives && (
                    <ul className="ml-6 mt-1 space-y-0.5 border-l border-outline pl-3">
                      {dbDocs.filter(d => d.source_type === "Drive").map(doc => (
                        <li 
                          key={doc.id}
                          onClick={() => handleFileClick(doc.id)}
                          className="flex items-center gap-2 text-on-surface-variant hover:text-primary cursor-pointer py-1.5 px-2 rounded-md hover:bg-surface-variant transition-all text-[12px] truncate"
                        >
                          <span className="material-symbols-outlined text-[14px] shrink-0">description</span> 
                          <span className="truncate">{doc.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>

                <li className="flex flex-col mt-1">
                  <div 
                    onClick={() => toggleFolder("wikis")}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-variant transition-all ${expandedFolders.wikis ? "text-primary font-medium" : "text-on-surface-variant"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        {expandedFolders.wikis ? "folder_open" : "folder"}
                      </span>
                      <span className="text-[13px]">{getVaultLabel("wikis", session.role)}</span>
                    </div>
                  </div>
                  {expandedFolders.wikis && (
                    <ul className="ml-6 mt-1 space-y-0.5 border-l border-outline pl-3">
                      {dbDocs.filter(d => d.source_type === "Wiki").map(doc => (
                        <li 
                          key={doc.id}
                          onClick={() => handleFileClick(doc.id)}
                          className="flex items-center gap-2 text-on-surface-variant hover:text-primary cursor-pointer py-1.5 px-2 rounded-md hover:bg-surface-variant transition-all text-[12px] truncate"
                        >
                          <span className="material-symbols-outlined text-[14px] shrink-0">description</span> 
                          <span className="truncate">{doc.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>

                <li className="flex flex-col mt-1">
                  <div 
                    onClick={() => toggleFolder("tickets")}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-variant transition-all ${expandedFolders.tickets ? "text-primary font-medium" : "text-on-surface-variant"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        {expandedFolders.tickets ? "folder_open" : "folder"}
                      </span>
                      <span className="text-[13px]">{getVaultLabel("tickets", session.role)}</span>
                    </div>
                  </div>
                  {expandedFolders.tickets && (
                    <ul className="ml-6 mt-1 space-y-0.5 border-l border-outline pl-3">
                      {dbDocs.filter(d => d.source_type === "Ticket").map(doc => (
                        <li 
                          key={doc.id}
                          onClick={() => handleFileClick(doc.id)}
                          className="flex items-center gap-2 text-on-surface-variant hover:text-primary cursor-pointer py-1.5 px-2 rounded-md hover:bg-surface-variant transition-all text-[12px] truncate"
                        >
                          <span className="material-symbols-outlined text-[14px] shrink-0">description</span> 
                          <span className="truncate">{doc.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>

                <li className="flex flex-col mt-1">
                  <div 
                    onClick={() => toggleFolder("chats")}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-variant transition-all ${expandedFolders.chats ? "text-primary font-medium" : "text-on-surface-variant"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        {expandedFolders.chats ? "folder_open" : "folder"}
                      </span>
                      <span className="text-[13px]">Chat Logs</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-semibold font-mono-data">EXEC</span>
                  </div>
                  {expandedFolders.chats && (
                    <ul className="ml-6 mt-1 space-y-0.5 border-l border-outline pl-3">
                      {dbDocs.filter(d => d.source_type === "Chat").map(doc => (
                        <li 
                          key={doc.id}
                          onClick={() => handleFileClick(doc.id)}
                          className={`flex items-center gap-2 cursor-pointer py-1.5 px-2 rounded-md hover:bg-surface-variant transition-all text-[12px] truncate ${
                            doc.access_level === "HR" || doc.access_level === "EXEC"
                              ? (session.is_locked ? "text-error font-medium" : "")
                              : "text-primary"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px] shrink-0">
                            {doc.access_level === "HR" || doc.access_level === "EXEC" ? "lock" : "chat"}
                          </span> 
                          <span className="truncate">{doc.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              </ul>

              <div className="h-px bg-outline/40 my-3"></div>
              <div className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant font-bold px-2 mb-1.5">Spotlight Innovations</div>
              <div className="space-y-2 px-1">
                <div className="p-2.5 bg-primary/10 border border-outline/30 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                    <span className="material-symbols-outlined text-[14px] text-purple-300">security_update_good</span>
                    1. RAG Safety Valve
                  </div>
                  <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                    <strong>Permission-Integrated Intelligence</strong> validates clearance levels before vector retrieval, blocking unauthorized requests.
                  </p>
                </div>
                
                <div className="p-2.5 bg-primary/10 border border-outline/30 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                    <span className="material-symbols-outlined text-[14px] text-purple-300">receipt_long</span>
                    2. Agent Transparency
                  </div>
                  <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                    Exposes step-by-step Planning, Search, and Synthesis chains dynamically inside the developer logs terminal for verification.
                  </p>
                </div>

                <div className="p-2.5 bg-primary/10 border border-outline/30 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                    <span className="material-symbols-outlined text-[14px] text-purple-300">hub</span>
                    3. Decision Memory
                  </div>
                  <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                    Uses Neo4j relational maps to document historical architectural decisions and pivots, keeping logs clear.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-outline bg-surface-dim">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-outline text-xs">
                <span className="material-symbols-outlined text-primary text-[16px]">verified_user</span>
                <span className="text-on-surface-variant font-medium">Compliance Enforcer</span>
              </div>
              {session.is_locked && (
                <button 
                  onClick={handleReset}
                  className="w-full mt-3 bg-error text-white font-label-md text-label-md uppercase tracking-wider py-2 rounded-lg btn-glow flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">warning</span> RESET DISPATCH
                </button>
              )}
            </div>
          </nav>
        )}

        {isLeftSidebarOpen && (
          <div 
            onMouseDown={startResizeSidebar}
            className="w-1 hover:bg-primary cursor-col-resize transition-colors duration-150 z-50 self-stretch shrink-0 bg-outline" 
          />
        )}

        <section className="flex-1 bg-background flex flex-col min-w-0 p-6 overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto pb-16 flex flex-col justify-start">
            <div className={`max-w-4xl mx-auto w-full flex flex-col gap-6 transition-all duration-300 ${showLogs ? "-translate-y-8 animate-none" : ""}`}>
              
              <div className="bg-surface shadow-sm rounded-2xl p-4 border border-outline flex items-center gap-3 shrink-0">
                <span className="material-symbols-outlined text-primary text-[24px]">search</span>
                <form onSubmit={handleQuery} className="flex-1 flex items-center gap-3">
                  <input 
                    className={`w-full bg-transparent border-none outline-none font-body-md text-on-surface placeholder:text-on-surface-variant/80 focus:ring-0 p-0 text-[15px]`}
                    placeholder={session.is_locked ? "SYSTEM LOCKDOWN ACTIVE: OVERRIDE DISPATCH" : "Search files, tickets, wikis or ask Nuara planner..."}
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={session.is_locked}
                  />
                  <button 
                    type="submit" 
                    disabled={session.is_locked || isLoading}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                      session.is_locked 
                        ? "bg-red-500/20 text-red-400 cursor-not-allowed border border-red-500/30" 
                        : "bg-primary text-on-primary btn-glow"
                    }`}
                  >
                    {isLoading ? "RUNNING..." : "QUERY"}
                  </button>
                </form>
              </div>

              <div className="bg-surface shadow-sm rounded-2xl border border-outline p-6 flex flex-col gap-6 shrink-0">
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-4 text-center">Agent Orchestration Path</div>
                  <div className="flex items-center gap-2 select-none relative max-w-xl mx-auto w-full">
                    <div className="absolute top-[15px] left-8 right-8 h-0.5 bg-outline z-0"></div>
                    
                    <div className="flex-1 flex flex-col items-center text-center z-10 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        results ? "bg-primary border-primary text-on-primary shadow-sm" : "bg-surface border-outline text-on-surface-variant"
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">psychology</span>
                      </div>
                      <span className="text-[11px] font-semibold mt-1 text-on-surface">Planning Agent</span>
                      <span className="text-[9px] text-on-surface-variant/75 font-mono-data">
                        {results ? "Success" : "Ready"}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center text-center z-10 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        isLoading 
                          ? "bg-surface border-primary text-primary animate-pulse shadow-sm" 
                          : results && results.status === "breach" 
                            ? "bg-error-container border-error text-error shadow-sm" 
                            : results 
                              ? "bg-primary border-primary text-on-primary shadow-sm" 
                              : "bg-surface border-outline text-on-surface-variant"
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {results && results.status === "breach" ? "gpp_bad" : "hub"}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold mt-1 text-on-surface">Knowledge Graph</span>
                      <span className={`text-[9px] font-mono-data ${results && results.status === "breach" ? "text-error font-bold" : "text-on-surface-variant/75"}`}>
                        {isLoading ? "Traversing" : results && results.status === "breach" ? "Blocked" : results ? "Completed" : "Ready"}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center text-center z-10 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        results && results.status === "breach" 
                          ? "bg-surface border-outline text-on-surface-variant/40" 
                          : results 
                            ? "bg-primary border-primary text-on-primary shadow-sm" 
                            : "bg-surface border-outline text-on-surface-variant"
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                      </div>
                      <span className="text-[11px] font-semibold mt-1 text-on-surface">Synthesis Agent</span>
                      <span className="text-[9px] text-on-surface-variant/75 font-mono-data">
                        {results && results.status === "breach" ? "Halted" : results ? "Success" : "Ready"}
                      </span>
                    </div>
                  </div>
                  {activeOrchestrationTool && (
                    <div className="mt-4 p-2 bg-[#d4af37]/20 border border-[#d4af37]/40 rounded-xl flex items-center justify-center gap-2 animate-pulse text-xs text-[#d4af37]">
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                      <span>Active Toolchain: <strong>{activeOrchestrationTool}</strong> executing model requests...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                  <div className="lg:col-span-2 bg-surface border border-outline rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-3">
                        <span className="material-symbols-outlined text-[18px]">psychology</span>
                        Neural Insights & Briefings
                      </div>
                      <div className="space-y-3">
                        {getNeuralInsights(session.role).map((insight, idx) => (
                          <div key={idx} className="p-3 bg-purple-950/20 border border-[#d4af37]/20 rounded-xl flex items-start gap-2.5 text-xs text-on-surface">
                            <span className="material-symbols-outlined text-[#d4af37] text-[16px] mt-0.5">info</span>
                            <div>
                              <span className="font-bold text-[#dec9e9] block mb-0.5">{insight.title}</span>
                              <span className="text-on-surface-variant leading-relaxed">{insight.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1 bg-surface border border-[#d4af37]/30 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider mb-3">
                        <span className="material-symbols-outlined text-[18px]">rule</span>
                        Action & Approval Hub
                      </div>
                      <div className="space-y-3">
                        {getPendingActions(session.role).map((action, idx) => (
                          <div key={idx} className="p-3 border border-outline rounded-xl flex flex-col gap-2 text-xs">
                            <div>
                              <span className="font-bold text-white block">{action.title}</span>
                              <span className="text-[10px] text-on-surface-variant leading-tight block mt-0.5">{action.description}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setReviewDraft(action)}
                                className="px-2 py-1 bg-surface-variant text-on-surface-variant rounded text-[10px] font-bold hover:bg-opacity-95 cursor-pointer flex-1"
                              >
                                Review Draft
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExecuteAction(action)}
                                className="px-2 py-1 bg-primary text-on-primary rounded text-[10px] font-bold hover:bg-opacity-95 cursor-pointer flex-1"
                              >
                                Execute
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {results && (
                  <>
                    <div className="h-px bg-outline"></div>
                    <div>
                      {results.status === "breach" ? (
                        <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-5 rounded-xl flex items-start gap-4">
                          <span className="material-symbols-outlined text-red-500 text-[28px] shrink-0">dangerous</span>
                          <div>
                            <h4 className="font-bold text-red-700 dark:text-red-400 text-[14px] uppercase tracking-wide">Security Override Isolation</h4>
                            <p className="text-[13px] text-red-900/80 dark:text-red-300 mt-1 leading-relaxed">
                              Authorization level check rejected: Standard access role lacks validation credentials to resolve restricted entity database clusters. Connection terminated.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div>
                            <h4 className="font-bold text-primary text-[11px] uppercase tracking-wider mb-1">Answer Synthesis</h4>
                            <p className="text-on-surface font-body-md text-[14px] leading-relaxed select-text">
                              {results.documents && results.documents[0] ? results.documents[0].content : "No answers returned. Query terms returned zero vector index mappings."}
                            </p>
                          </div>

                          {results.documents && results.documents.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Verified Citations</div>
                              <div className="flex flex-wrap gap-2">
                                {results.documents.map((doc) => (
                                  <div 
                                    key={doc.id}
                                    onClick={() => handleFileClick(doc.id)}
                                    className="px-3 py-1.5 bg-surface-variant hover:bg-outline border border-outline rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 text-[11px] font-semibold text-on-surface"
                                  >
                                    <span className="material-symbols-outlined text-[13px] text-primary">description</span>
                                    <span>{doc.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 z-40">
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="px-4 py-2 bg-surface hover:bg-surface-variant border border-outline rounded-xl text-on-surface shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showLogs ? "keyboard_arrow_down" : "keyboard_arrow_up"}
              </span>
              <span>View Developer Logs</span>
            </button>
          </div>

          {showLogs && (
            <div className="w-full max-w-4xl mx-auto mt-4 bg-[#090d16] border border-outline rounded-2xl shadow-xl h-56 flex flex-col overflow-hidden shrink-0 animate-slide-up z-30">
              <div className="bg-surface-container-high px-4 py-2.5 flex items-center justify-between border-b border-outline">
                <span className="text-[11px] font-bold text-on-surface-variant font-mono-data">system_logs.json</span>
                <button 
                  onClick={() => setShowLogs(false)}
                  className="text-on-surface-variant hover:text-primary cursor-pointer flex items-center"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="p-3 overflow-y-auto text-[11px] font-mono-data leading-relaxed text-slate-400 flex flex-col gap-0.5 select-text">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`flex gap-4 ${
                      log.level === "WARN" ? "text-rose-400 bg-rose-500/5 -mx-3 px-3 border-l-2 border-rose-500" : 
                      log.level === "DEBUG" ? "text-amber-400" : ""
                    }`}
                  >
                    <span className="opacity-40 select-none whitespace-nowrap">{log.timestamp.split("T")[1]?.slice(0, 8) || log.timestamp}</span>
                    <span className="text-primary opacity-80">[{log.component}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </section>

        {isRightSidebarOpen && (
          <div 
            onMouseDown={startResizeLedger}
            className="w-1 hover:bg-primary cursor-col-resize transition-colors duration-150 z-50 self-stretch shrink-0 bg-outline" 
          />
        )}

        {isRightSidebarOpen && (
          <aside 
            style={{ width: `${ledgerWidth}px` }} 
            className="bg-surface border-l border-outline flex flex-col z-30 shrink-0 relative p-6"
          >
            {session.is_locked && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-surface/90 backdrop-blur-md">
                <div aria-hidden="true" className="absolute inset-0 opacity-5 font-mono-data text-[7px] text-error overflow-hidden break-all leading-none z-0 select-none">
                  01000100 01000101 01001110 01001001 01000100 00100000 01000001 01000011 01000011 01000011 01000101 01010011 01010011 00100000 01010110 01001001 01001110 01001100 01000001 01010100 01001001 01001111 01011010
                </div>
                <div className="relative z-10 text-center p-4 border border-outline rounded-2xl bg-background shadow-lg max-w-[280px]">
                  <span className="material-symbols-outlined text-4xl text-error mb-2">lock</span>
                  <h2 className="font-headline-md text-on-surface tracking-wide uppercase text-sm font-bold mb-1">Restricted Zone</h2>
                  <div className="font-mono-data text-error text-[10px] mb-3">ACCESS_DENIED_0x403</div>
                  <p className="font-body-sm text-on-surface-variant text-[11px] leading-relaxed mb-4">
                    Insight Graph nodes require elevated Executive or HR clearance levels.
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col h-full gap-4">
              <div className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant font-bold">Organizational Graph</div>
              
              <div className="flex-1 bg-surface-container-high border border-outline rounded-2xl relative overflow-hidden min-h-[300px] shadow-inner p-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ stroke: "var(--outline-variant)", strokeWidth: "1.5px" }}>
                      <line x1="50%" x2="20%" y1="25%" y2="65%"></line>
                      <line x1="50%" x2="80%" y1="25%" y2="65%"></line>
                      <line x1="50%" x2="50%" y1="25%" y2="85%"></line>
                      <line className="dash-anim" style={{ stroke: "var(--primary)", strokeWidth: "2px" }} x1="50%" x2="20%" y1="25%" y2="65%"></line>
                    </svg>

                    <div className="absolute top-[25%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary-container border border-primary flex items-center justify-center rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.15)] z-10">
                      <span className="material-symbols-outlined text-[16px] text-primary">hub</span>
                    </div>
                    <div className="absolute top-[25%] left-[50%] -translate-x-1/2 -translate-y-10 text-[10px] font-bold text-primary uppercase tracking-wide">Query Node</div>

                    <div className="absolute top-[65%] left-[20%] -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-surface border border-outline flex items-center justify-center rounded-xl shadow-sm z-10 hover:border-primary cursor-pointer active:scale-90">
                      <span className="material-symbols-outlined text-[14px] text-on-surface">description</span>
                    </div>
                    <div className="absolute top-[65%] left-[20%] -translate-x-1/2 translate-y-5 text-[10px] font-semibold text-on-surface-variant">arch_04.md</div>

                    <div className="absolute top-[65%] left-[80%] -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-surface border border-outline flex items-center justify-center rounded-xl shadow-sm z-10">
                      <span className="material-symbols-outlined text-[14px] text-on-surface">person</span>
                    </div>
                    <div className="absolute top-[65%] left-[80%] -translate-x-1/2 translate-y-5 text-[10px] font-semibold text-on-surface-variant">Standard_Eng</div>

                    <div className="absolute top-[85%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-surface border border-outline flex items-center justify-center rounded-xl shadow-sm z-10">
                      <span className="material-symbols-outlined text-[14px] text-on-surface">forum</span>
                    </div>
                    <div className="absolute top-[85%] left-[50%] -translate-x-1/2 translate-y-5 text-[10px] font-semibold text-on-surface-variant">Slack Chat</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>

      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline w-full max-w-xl p-6 rounded-2xl shadow-xl relative">
            <button 
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary cursor-pointer flex items-center p-1 hover:bg-surface-variant rounded-lg"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="flex items-center gap-2 border-b border-outline pb-3 mb-4">
              <span className="material-symbols-outlined text-primary text-[22px]">description</span>
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-base">{selectedDoc.name}</h2>
            </div>
            <div className="space-y-4 font-body-md text-on-surface">
              <div className="bg-background p-4 border border-outline rounded-xl max-h-60 overflow-y-auto select-text font-mono-data text-xs whitespace-pre-line leading-relaxed text-on-surface">
                {selectedDoc.content}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-2">
                <div>
                  <span className="text-on-surface-variant uppercase block tracking-wider text-[9px] mb-0.5">Source Type</span>
                  <span className="text-primary font-bold text-[12px]">{selectedDoc.source_type}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase block tracking-wider text-[9px] mb-0.5">Access Clearance</span>
                  <span className="text-tertiary font-bold text-[12px]">{selectedDoc.access_level}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-on-surface-variant uppercase block tracking-wider text-[9px] mb-0.5">Resource Link</span>
                  <a href={selectedDoc.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all font-mono-data text-[11px] font-normal">
                    {selectedDoc.url}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline w-full max-w-4xl h-[80vh] p-6 rounded-2xl shadow-xl relative flex flex-col">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary cursor-pointer p-1 hover:bg-surface-variant rounded-lg flex items-center"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="flex items-center gap-2 border-b border-outline pb-3 mb-4">
              <span className="material-symbols-outlined text-primary text-[22px]">settings_accessibility</span>
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-base">Nuara Governance & Admin Console</h2>
            </div>

            <div className="flex-1 flex overflow-hidden gap-6 min-h-0">
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                <div className="border border-outline bg-surface-variant/40 p-4 rounded-xl">
                  <h3 className="font-label-md text-primary uppercase mb-3 text-xs font-bold">Upload / Seed Document</h3>
                  <form onSubmit={handleCreateDocument} className="space-y-3">
                    <div>
                      <label className="text-[10px] text-on-surface-variant uppercase block mb-1 font-bold">File Name</label>
                      <input 
                        className="w-full bg-surface border border-outline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary font-mono-data text-xs p-2 text-on-surface"
                        placeholder="e.g. Q4_Strategy.txt"
                        type="text" 
                        value={newDoc.name}
                        onChange={e => setNewDoc({...newDoc, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-on-surface-variant uppercase block mb-1 font-bold">Content Body</label>
                      <textarea 
                        className="w-full bg-surface border border-outline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary font-mono-data text-xs p-2 text-on-surface h-24 resize-none"
                        placeholder="Type document contents..."
                        value={newDoc.content}
                        onChange={e => setNewDoc({...newDoc, content: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-on-surface-variant uppercase block mb-1 font-bold">Source Folder</label>
                        <select 
                          className="w-full bg-surface border border-outline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary font-mono-data text-xs p-2 text-on-surface"
                          value={newDoc.source_type}
                          onChange={e => setNewDoc({...newDoc, source_type: e.target.value})}
                        >
                          <option value="Drive">Drives</option>
                          <option value="Wiki">Wikis</option>
                          <option value="Ticket">Tickets</option>
                          <option value="Chat">Chat Logs</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-on-surface-variant uppercase block mb-1 font-bold">Required Clearance</label>
                        <select 
                          className="w-full bg-surface border border-outline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary font-mono-data text-xs p-2 text-on-surface"
                          value={newDoc.access_level}
                          onChange={e => setNewDoc({...newDoc, access_level: e.target.value})}
                        >
                          <option value="PUBLIC">PUBLIC</option>
                          <option value="ENG">ENG</option>
                          <option value="HR">HR</option>
                          <option value="EXEC">EXEC</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-on-surface-variant uppercase block mb-1 font-bold">Resource URL</label>
                      <input 
                        className="w-full bg-surface border border-outline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary font-mono-data text-xs p-2 text-on-surface"
                        placeholder="https://nexus.internal/docs/filename"
                        type="text" 
                        value={newDoc.url}
                        onChange={e => setNewDoc({...newDoc, url: e.target.value})}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={ingestLoading}
                      className="w-full py-2 bg-primary text-on-primary font-label-md uppercase tracking-wider text-xs rounded-lg btn-glow font-bold cursor-pointer"
                    >
                      {ingestLoading ? "Vectorizing & Ingesting..." : "Seed to Vector & Graph Stores"}
                    </button>
                  </form>

                  {ingestOutput && (
                    <div className="mt-4 p-3 bg-surface border border-outline rounded-lg space-y-2">
                      <div className="text-[10px] text-primary uppercase font-bold tracking-wider">Vectorizer Studio Processing</div>
                      
                      <div className="space-y-1">
                        <div className="text-[9px] text-on-surface-variant font-bold uppercase">1. Semantic Chunking</div>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                          {ingestOutput.chunks.map((chk, idx) => (
                            <div key={idx} className="bg-surface-variant/40 p-1.5 rounded text-[11px] font-mono-data leading-relaxed text-on-surface">
                              <span className="text-purple-300 mr-1">[Chunk {idx + 1}]</span>
                              {chk}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-outline/25 my-1"></div>

                      <div className="flex items-center justify-between text-[11px] gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] text-on-surface-variant font-bold uppercase block">2. Vector Embeddings (Qdrant)</span>
                          <span className="font-mono-data text-purple-300 text-[10px] block truncate">
                            [{ingestOutput.embeddings[0] ? ingestOutput.embeddings[0].join(", ") : "0.0"}]
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-on-surface-variant font-bold uppercase block">3. Relational Tags (Neo4j)</span>
                          <span className="font-mono-data text-purple-300 text-[10px]">
                            {ingestOutput.entities.join(", ") || "None"}
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-outline/25 my-1"></div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase">4. ACL Permissions</span>
                        <span className="px-1.5 py-0.5 rounded font-mono-data font-bold text-[9px] bg-primary text-on-primary">
                          {ingestOutput.access_level}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-80 flex flex-col gap-4 overflow-y-auto border-l border-outline pl-6">
                <div>
                  <h3 className="font-label-md text-primary uppercase mb-2 text-xs font-bold">Access Control List</h3>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {dbDocs.map(doc => (
                      <div key={doc.id} className="border border-outline bg-surface-variant/30 p-2 rounded-lg flex flex-col gap-1">
                        <div className="font-mono-data text-[11px] text-on-surface truncate font-semibold">{doc.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-on-surface-variant font-bold uppercase">Clearance</span>
                          <select 
                            className="bg-surface border border-outline rounded font-mono-data text-[9px] p-0.5 text-on-surface focus:outline-none"
                            value={doc.access_level}
                            onChange={e => handleUpdatePermission(doc.id, e.target.value)}
                          >
                            <option value="PUBLIC">PUBLIC</option>
                            <option value="ENG">ENG</option>
                            <option value="HR">HR</option>
                            <option value="EXEC">EXEC</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-outline pt-4 mt-auto">
                  <h3 className="font-label-md text-error uppercase mb-2 text-xs font-bold">Gap Analytics</h3>
                  <div className="bg-[#090d16] border border-outline p-3 rounded-lg text-[10px] font-mono-data text-slate-400 leading-relaxed max-h-40 overflow-y-auto select-text">
                    {gapAnalysis.map((gap, i) => (
                      <div key={i} className="mb-2 last:mb-0 border-b border-slate-800 pb-1">
                        &gt; {gap}
                      </div>
                    ))}
                  </div>
                </div>

                {pendingMembers.length > 0 && (
                  <div className="border-t border-outline pt-4 mt-4">
                    <h3 className="font-label-md text-primary uppercase mb-2 text-xs font-bold">Pending Requesters</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {pendingMembers.map(member => (
                        <div key={member.email} className="border border-outline bg-surface-variant/30 p-2.5 rounded-lg flex flex-col gap-1.5 text-xs text-on-surface">
                          <div>
                            <div className="font-bold text-[11px] text-white">{member.first_name} {member.middle_name} {member.last_name}</div>
                            <div className="text-[10px] text-on-surface-variant font-mono-data mt-0.5 truncate">{member.email}</div>
                            <div className="text-[10px] text-on-surface-variant font-mono-data">{member.phone || "No Phone"}</div>
                            <div className="text-[10px] text-on-surface-variant font-mono-data">Branch: {member.branch}</div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <select
                              className="bg-surface border border-outline rounded text-[9px] p-1 text-on-surface focus:outline-none flex-1"
                              value={selectedRoles[member.email] || "Standard_Eng"}
                              onChange={e => setSelectedRoles({...selectedRoles, [member.email]: e.target.value})}
                            >
                              <option value="Standard_Eng">Engineer</option>
                              <option value="HR_Manager">HR Manager</option>
                              <option value="Executive">Executive</option>
                            </select>
                            <button
                              onClick={() => handleApproveMember(member.email)}
                              className="px-2.5 py-1 bg-primary text-on-primary rounded text-[9px] font-bold hover:bg-opacity-90 transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isCopilotOpen && (
          <div className="w-[380px] h-[500px] bg-surface border border-outline rounded-2xl shadow-xl mb-4 flex flex-col overflow-hidden animate-slide-up">
            <div className="bg-primary text-on-primary px-4 py-3 flex items-center justify-between border-b border-outline">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">psychology</span>
                <span className="font-bold text-xs uppercase tracking-wider text-white">Onboarding Copilot</span>
              </div>
              <button 
                onClick={() => setIsCopilotOpen(false)}
                className="text-on-primary/80 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface-dim select-text">
              {copilotMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-primary text-on-primary rounded-tr-none text-white font-medium" 
                      : "bg-surface border border-outline text-on-surface rounded-tl-none font-medium"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {copilotMessages.length <= 1 && (
                <div className="p-3 bg-surface-variant/40 border border-outline rounded-xl mt-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Suggested Topics</div>
                  <div className="grid grid-cols-2 gap-2">
                    {getSuggestionChips(session.role).map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCopilotSendSimulated(chip.query)}
                        className="p-2 bg-surface hover:bg-primary/10 border border-outline rounded-lg text-left text-[11px] text-on-surface transition-all active:scale-95 cursor-pointer truncate font-medium"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {copilotLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-outline text-on-surface-variant rounded-2xl rounded-tl-none px-3.5 py-2 text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={copilotEndRef} />
            </div>

            <form onSubmit={handleCopilotSend} className="p-3 border-t border-outline bg-surface flex items-center gap-2">
              <input 
                type="text" 
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Ask me how NexusBrain works..."
                className="flex-1 bg-surface-variant border border-outline rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary"
              />
              <button 
                type="submit"
                className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:bg-opacity-95 active:scale-95 transition-all btn-glow"
              >
                <span className="material-symbols-outlined text-[16px] text-white">send</span>
              </button>
            </form>
          </div>
        )}

        <button 
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className="w-12 h-12 rounded-full bg-[#7251b5] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all btn-glow cursor-pointer"
        >
          <span className="material-symbols-outlined text-[24px]">
            {isCopilotOpen ? "close" : "forum"}
          </span>
        </button>
      </div>

      {reviewDraft && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-[#d4af37] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline pb-3">
              <h3 className="font-bold text-[#d4af37] uppercase tracking-wider text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">find_in_page</span>
                Review Pending Action Draft
              </h3>
              <button onClick={() => setReviewDraft(null)} className="text-on-surface-variant hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="bg-[#0a0612] p-4 rounded-xl border border-outline/30 text-xs font-mono-data text-slate-300 leading-relaxed max-h-60 overflow-y-auto select-text">
              {reviewDraft.draft}
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button 
                type="button"
                onClick={() => setReviewDraft(null)}
                className="px-4 py-2 bg-surface-variant text-on-surface rounded-xl text-xs font-bold hover:bg-opacity-90 cursor-pointer"
              >
                Close
              </button>
              <button 
                type="button"
                onClick={() => {
                  setReviewDraft(null);
                  handleExecuteAction(reviewDraft);
                }}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-opacity-95 cursor-pointer btn-glow text-white font-bold"
              >
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {dnaTimeline && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-[#d4af37] p-6 rounded-2xl max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline pb-3">
              <h3 className="font-bold text-[#d4af37] uppercase tracking-wider text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">history</span>
                Project DNA Onboarding Timeline
              </h3>
              <button onClick={() => setDnaTimeline(false)} className="text-on-surface-variant hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {session.role && (session.role.toLowerCase() === "surgeon" || session.role.toLowerCase() === "medical clerk") ? (
                <>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">6 Months Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">EHR Standardized Billing Codes Adopted</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">System configured to automatically validate Patient records against ICD-10 medical coding standards.</p>
                  </div>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">3 Months Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">Surgeon Clearance Gate Implemented</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Medical vault clearances isolated to block non-surgeon employee logs from referencing clinical bypass details.</p>
                  </div>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">1 Month Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">Insurance Mapping Vectors Synced</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Integrated medical billing indexes inside vector coordinates for proactive semantic search analysis.</p>
                  </div>
                </>
              ) : session.role && session.role.toLowerCase() === "officer" ? (
                <>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">6 Months Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">Precinct Case File Repository Configured</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Standard case report indexing folders created. Database locked under law enforcement namespace isolation.</p>
                  </div>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">3 Months Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">Evidence Node Synapses Linked</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Fingerprint scans and evidence logs integrated with Neo4j relational networks for cross-Precinct case maps.</p>
                  </div>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">1 Month Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">FIR Toolchain Integrations Completed</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Connected the FIR planning agents to allow automated summary drafting on evidence index matching.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">6 Months Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">Semantic RAG Retrievers Built</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Constructed core dense vector search embeddings pipeline targeting latency under 2 seconds.</p>
                  </div>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">3 Months Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">RAG Safety Clearance Engine Deployed</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Constructed pre-retrieval security filter systems to intercept file searches matching user context vaults.</p>
                  </div>
                  <div className="border-l-2 border-[#d4af37] pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <div className="text-[10px] text-slate-400 font-mono-data">1 Month Ago</div>
                    <div className="text-xs text-white font-bold mt-0.5">Multi-Tenant Vault Schema Configured</div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Updated tables to separate documents by company tenant namespace in postgres metadata tables.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
