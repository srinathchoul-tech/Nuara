import { useState, useEffect } from "react";

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("pending");
  const [companyName, setCompanyName] = useState(localStorage.getItem("companyName") || "Nuara");
  const [adminEmail, setAdminEmail] = useState(localStorage.getItem("loggedUser") || "admin@nexusbrain.com");
  const [systemStatus, setSystemStatus] = useState("Online");

  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [selectedRequester, setSelectedRequester] = useState(null);

  const [members, setMembers] = useState([]);

  const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [acls, setAcls] = useState({});

  const [connectors, setConnectors] = useState({
    drive: true,
    slack: false,
    jira: true
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [revisions, setRevisions] = useState([
    { id: 1, title: "Nuara Core Policy Document", author: "engineer@nexusbrain.com", version: "v1.2", date: "2026-07-04" },
    { id: 2, title: "Employee Benefit Matrix", author: "hr@nexusbrain.com", version: "v2.0", date: "2026-07-04" }
  ]);

  const [gapAlerts, setGapAlerts] = useState([
    { id: 1, message: "Project Alpha is complete in Jira but lacks a Post-Mortem in Wiki. Draft now?" },
    { id: 2, message: "HR Recruitment guidelines revised but vector search database holds legacy FY24 sheets." }
  ]);

  const [metrics, setMetrics] = useState({
    latency: "1.24s",
    graphNodes: 248,
    graphEdges: 395,
    memoryHealth: "100%"
  });

  const fetchPending = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/pending-members?company_name=${companyName}`);
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRolesAndAcls = async () => {
    try {
      const resRoles = await fetch(`http://127.0.0.1:8000/api/admin/roles?company_name=${companyName}`);
      if (resRoles.ok) {
        const data = await resRoles.json();
        setRoles(data);
      }
      const resAcls = await fetch(`http://127.0.0.1:8000/api/admin/acls?company_name=${companyName}`);
      if (resAcls.ok) {
        const data = await resAcls.json();
        setAcls(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/logs");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/documents");
      if (res.ok) {
        const resUsers = await fetch(`http://127.0.0.1:8000/api/auth/company-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "hr@nexusbrain.com", password: "password123", company_name: "Nuara", role: "EMPLOYEE" })
        });
        setMembers([
          { first_name: "Srinath", last_name: "Choul", email: "engineer@nexusbrain.com", phone: "1234567890", branch: "Main Branch", role: "Standard_Eng" },
          { first_name: "Sarah", last_name: "Connor", email: "hr@nexusbrain.com", phone: "2345678901", branch: "Main Branch", role: "HR_Manager" },
          { first_name: "John", last_name: "Connor", email: "ceo@nexusbrain.com", phone: "3456789012", branch: "Main Branch", role: "Executive" }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchRolesAndAcls();
    fetchLogs();
    loadMembers();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (email) => {
    const role = selectedRoles[email] || "Standard_Eng";
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/approve-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, assigned_role: role })
      });
      if (res.ok) {
        fetchPending();
        loadMembers();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName, role_name: newRoleName.trim() })
      });
      if (res.ok) {
        setNewRoleName("");
        fetchRolesAndAcls();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRole = async (roleName) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/roles?company_name=${companyName}&role_name=${roleName}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchRolesAndAcls();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAcl = async (roleName, folder) => {
    const currentFolders = acls[roleName] || [];
    const nextFolders = currentFolders.includes(folder)
      ? currentFolders.filter(f => f !== folder)
      : [...currentFolders, folder];
      
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/acls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName, role_name: roleName, folders: nextFolders })
      });
      if (res.ok) {
        fetchRolesAndAcls();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLogs = auditLogs.filter(log => 
    log.msg.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.component.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-screen flex bg-[#0a0612] text-white overflow-hidden font-body-sm selection:bg-[#d4af37] selection:text-black">
      <aside className="w-64 bg-[#140d21] border-r border-[#d4af37]/30 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-[#d4af37]/20 flex items-center justify-between">
            <span className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-[#d4af37]">NUARA</span>
            <span className="px-2 py-0.5 border border-[#d4af37] text-[#d4af37] rounded text-[9px] uppercase tracking-wider font-bold">Admin</span>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab("pending")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === "pending"
                  ? "bg-gradient-to-r from-purple-900 to-[#140d21] text-white border-l-2 border-[#d4af37] shadow-lg shadow-purple-950/45"
                  : "text-slate-400 hover:text-white hover:bg-purple-950/20"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              Pending Requests
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === "directory"
                  ? "bg-gradient-to-r from-purple-900 to-[#140d21] text-white border-l-2 border-[#d4af37] shadow-lg shadow-purple-950/45"
                  : "text-slate-400 hover:text-white hover:bg-purple-950/20"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">group</span>
              Member Directory
            </button>
            <button
              onClick={() => setActiveTab("acls")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === "acls"
                  ? "bg-gradient-to-r from-purple-900 to-[#140d21] text-white border-l-2 border-[#d4af37] shadow-lg shadow-purple-950/45"
                  : "text-slate-400 hover:text-white hover:bg-purple-950/20"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              ACL Governance
            </button>
            <button
              onClick={() => setActiveTab("connectors")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === "connectors"
                  ? "bg-gradient-to-r from-purple-900 to-[#140d21] text-white border-l-2 border-[#d4af37] shadow-lg shadow-purple-950/45"
                  : "text-slate-400 hover:text-white hover:bg-purple-950/20"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">hub</span>
              Data Connectors
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === "audit"
                  ? "bg-gradient-to-r from-purple-900 to-[#140d21] text-white border-l-2 border-[#d4af37] shadow-lg shadow-purple-950/45"
                  : "text-slate-400 hover:text-white hover:bg-purple-950/20"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">history_edu</span>
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all ${
                activeTab === "analytics"
                  ? "bg-gradient-to-r from-purple-900 to-[#140d21] text-white border-l-2 border-[#d4af37] shadow-lg shadow-purple-950/45"
                  : "text-slate-400 hover:text-white hover:bg-purple-950/20"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">monitoring</span>
              Analytics
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#d4af37]/20 flex flex-col gap-2">
          <div className="text-[10px] text-slate-400 tracking-wider">
            Logged in as: <span className="text-[#d4af37] block font-mono-data truncate">{adminEmail}</span>
          </div>
          <button 
            onClick={onLogout}
            className="w-full py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900 text-red-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[#140d21] border-b border-[#d4af37]/30 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold uppercase tracking-wider text-[#d4af37]">{companyName} Governance Control</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase text-slate-400">System Status:</span>
              <button 
                onClick={() => setSystemStatus(systemStatus === "Online" ? "Offline" : "Online")}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded border cursor-pointer ${
                  systemStatus === "Online" 
                    ? "bg-green-950/30 border-green-500 text-green-300"
                    : "bg-red-950/30 border-red-500 text-red-300"
                }`}
              >
                {systemStatus}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          {activeTab === "pending" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Pending Registrations</h2>
              <div className="bg-[#140d21] border border-[#d4af37]/30 rounded-xl overflow-hidden shadow-lg shadow-[#0a0612]/50">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-purple-950/40 border-b border-[#d4af37]/20 text-[#d4af37] uppercase tracking-wider font-bold">
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Branch</th>
                      <th className="p-4">Assign Role</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(req => (
                      <tr key={req.email} className="border-b border-[#d4af37]/10 hover:bg-purple-950/10">
                        <td className="p-4 font-semibold text-white">{req.first_name} {req.middle_name} {req.last_name}</td>
                        <td className="p-4 font-mono-data text-slate-300">{req.email}</td>
                        <td className="p-4 font-mono-data text-slate-300">{req.phone}</td>
                        <td className="p-4 text-slate-300">{req.branch}</td>
                        <td className="p-4">
                          <select
                            className="bg-[#0a0612] border border-[#d4af37]/30 rounded p-1 text-xs text-white"
                            value={selectedRoles[req.email] || "Standard_Eng"}
                            onChange={e => setSelectedRoles({...selectedRoles, [req.email]: e.target.value})}
                          >
                            {roles.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 flex gap-2 justify-center">
                          <button
                            onClick={() => setSelectedRequester(req)}
                            className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/60 border border-[#d4af37]/30 text-white rounded text-[11px] font-bold cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleApprove(req.email)}
                            className="px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-[#d4af37] text-black rounded text-[11px] font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendingRequests.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 font-mono-data">No pending requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "directory" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Member Directory</h2>
              <div className="bg-[#140d21] border border-[#d4af37]/30 rounded-xl overflow-hidden shadow-lg shadow-[#0a0612]/50">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-purple-950/40 border-b border-[#d4af37]/20 text-[#d4af37] uppercase tracking-wider font-bold">
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Branch</th>
                      <th className="p-4">Assigned Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.email} className="border-b border-[#d4af37]/10 hover:bg-purple-950/10">
                        <td className="p-4 font-semibold text-white">{m.first_name} {m.last_name}</td>
                        <td className="p-4 font-mono-data text-slate-300">{m.email}</td>
                        <td className="p-4 font-mono-data text-slate-300">{m.phone}</td>
                        <td className="p-4 text-slate-300">{m.branch}</td>
                        <td className="p-4 font-bold text-[#d4af37]">{m.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "acls" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-4">
                <h2 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Custom Company Roles</h2>
                <form onSubmit={handleAddRole} className="bg-[#140d21] border border-[#d4af37]/30 p-4 rounded-xl space-y-3">
                  <input
                    type="text"
                    placeholder="Role Name (e.g. Surgeon)"
                    className="w-full bg-[#0a0612] border border-[#d4af37]/30 rounded-lg p-2 text-xs text-white"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    required
                  />
                  <button type="submit" className="w-full py-2 bg-gradient-to-r from-yellow-600 to-[#d4af37] text-black font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer">
                    Add Role
                  </button>
                </form>

                <div className="bg-[#140d21] border border-[#d4af37]/30 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Registered Roles</span>
                  {roles.map(role => (
                    <div key={role} className="flex items-center justify-between border-b border-purple-950/50 pb-2">
                      <span className="text-xs font-mono-data font-bold text-white">{role}</span>
                      <button 
                        onClick={() => handleDeleteRole(role)}
                        className="text-red-400 hover:text-red-600 text-xs cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h2 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Permission Mapping Grid</h2>
                <div className="bg-[#140d21] border border-[#d4af37]/30 rounded-xl overflow-hidden shadow-lg p-6">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#d4af37]/20 text-[#d4af37] font-bold uppercase">
                        <th className="p-3">Role</th>
                        <th className="p-3 text-center">Google Drive</th>
                        <th className="p-3 text-center">Wiki Folders</th>
                        <th className="p-3 text-center">Jira Tickets</th>
                        <th className="p-3 text-center">Slack Chat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map(role => (
                        <tr key={role} className="border-b border-[#d4af37]/10 hover:bg-purple-950/10">
                          <td className="p-3 font-bold text-white font-mono-data">{role}</td>
                          {["Drive", "Wiki", "Tickets", "Chat"].map(folder => {
                            const hasPerm = (acls[role] || []).includes(folder);
                            return (
                              <td key={folder} className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={hasPerm}
                                  onChange={() => handleToggleAcl(role, folder)}
                                  className="accent-[#d4af37] h-4 w-4 rounded"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "connectors" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Data Connectors Hub</h2>
                <div className="bg-[#140d21] border border-[#d4af37]/30 p-6 rounded-xl space-y-4">
                  {Object.keys(connectors).map(key => (
                    <div key={key} className="flex items-center justify-between border-b border-purple-950 pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-bold text-white">{key === "drive" ? "Google Drive" : key === "slack" ? "Slack Chat" : "Jira Tickets"}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Synchronizes active source tags to vector DB</p>
                      </div>
                      <button
                        onClick={() => setConnectors({...connectors, [key]: !connectors[key]})}
                        className={`w-12 h-6 rounded-full p-0.5 transition-all ${
                          connectors[key] ? "bg-[#d4af37] flex justify-end" : "bg-purple-950/60 flex justify-start"
                        }`}
                      >
                        <span className="w-5 h-5 bg-[#0a0612] rounded-full shadow-md"></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Knowledge Graph Sync</h2>
                <div className="bg-[#140d21] border border-[#d4af37]/30 p-6 rounded-xl grid grid-cols-2 gap-4">
                  <div className="bg-[#0a0612] border border-[#d4af37]/20 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Total Entities Linked</span>
                    <strong className="text-2xl text-[#d4af37] font-mono-data block mt-1">{metrics.graphNodes}</strong>
                  </div>
                  <div className="bg-[#0a0612] border border-[#d4af37]/20 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Active Synapses</span>
                    <strong className="text-2xl text-[#d4af37] font-mono-data block mt-1">{metrics.graphEdges}</strong>
                  </div>
                  <div className="bg-[#0a0612] border border-[#d4af37]/20 p-4 rounded-xl text-center col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Graph Relational Integrity</span>
                    <strong className="text-lg text-green-400 font-mono-data block mt-1">Excellent (100% Health)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Agent Transparency & Logs</h2>
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="bg-[#140d21] border border-[#d4af37]/30 rounded-lg px-4 py-2 text-xs text-white w-64"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-[#140d21] border border-[#d4af37]/30 rounded-xl p-6 h-96 overflow-y-auto space-y-2">
                  {filteredLogs.map(log => (
                    <div key={log.id} className="text-xs font-mono-data border-b border-purple-950 pb-2 last:border-0 last:pb-0">
                      <span className="text-[#d4af37] mr-2">[{log.timestamp}]</span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 text-[10px] uppercase font-bold mr-2">{log.component}</span>
                      <span className="text-slate-300">{log.msg}</span>
                    </div>
                  ))}
                </div>

                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider">Corporate Decision Memory</h3>
                  <div className="bg-[#140d21] border border-[#d4af37]/30 p-4 rounded-xl space-y-2.5">
                    {revisions.map(rev => (
                      <div key={rev.id} className="text-xs border-b border-purple-950 pb-2 last:border-0 last:pb-0">
                        <div className="font-bold text-white">{rev.title}</div>
                        <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                          <span>Revision: {rev.version}</span>
                          <span>Author: {rev.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-4">
                <h2 className="text-lg font-bold text-red-400 uppercase tracking-wider">Knowledge-Gap Alerts</h2>
                <div className="bg-[#140d21] border border-red-500/30 p-4 rounded-xl space-y-3">
                  {gapAlerts.map(alert => (
                    <div key={alert.id} className="border border-red-500/20 bg-red-950/20 p-3 rounded-lg flex items-start gap-2 text-xs">
                      <span className="material-symbols-outlined text-red-400 text-[16px]">warning</span>
                      <span className="text-slate-300 leading-relaxed">{alert.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h2 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Performance Monitor</h2>
                <div className="bg-[#140d21] border border-[#d4af37]/30 p-6 rounded-xl grid grid-cols-3 gap-6">
                  <div className="bg-[#0a0612] border border-[#d4af37]/20 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Query Latency</span>
                    <strong className="text-2xl text-green-400 font-mono-data block mt-1">&lt; 1.5s</strong>
                  </div>
                  <div className="bg-[#0a0612] border border-[#d4af37]/20 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Vector Ingestion Speed</span>
                    <strong className="text-2xl text-[#d4af37] font-mono-data block mt-1">45ms / KB</strong>
                  </div>
                  <div className="bg-[#0a0612] border border-[#d4af37]/20 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">System Load</span>
                    <strong className="text-2xl text-green-400 font-mono-data block mt-1">2% CPU</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedRequester && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#140d21] border border-[#d4af37] p-6 rounded-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-purple-950 pb-3">
              <h3 className="font-bold text-[#d4af37] uppercase tracking-wider">Registration Details</h3>
              <button 
                onClick={() => setSelectedRequester(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 uppercase text-[9px] block">Full Name</span>
                <span className="text-white text-sm font-semibold">{selectedRequester.first_name} {selectedRequester.middle_name} {selectedRequester.last_name}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[9px] block">Email Address</span>
                <span className="text-white font-mono-data block">{selectedRequester.email}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[9px] block">Phone Number</span>
                <span className="text-white font-mono-data block">{selectedRequester.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[9px] block">Branch Location</span>
                <span className="text-white font-mono-data block">{selectedRequester.branch}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
