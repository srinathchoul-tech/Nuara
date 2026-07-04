import React, { useState, useEffect, useRef } from "react";

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

  const switchUser = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/session/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json();
      setSession(data);
      setResults(null);
      setQuery("");
      fetchLogs();
    } catch (err) {
      console.error(err);
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

  useEffect(() => {
    fetchSession();
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const selectDocumentQuery = (docName, queryText) => {
    setQuery(queryText);
  };

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-body-sm relative select-none ${session.is_locked ? "selection:bg-error selection:text-on-error" : "selection:bg-primary-container selection:text-on-primary-container"}`}>
      {session.is_locked && <div className="crt-overlay"></div>}

      <header className="bg-surface border-b border-outline-variant flex justify-between items-center px-panel-padding h-12 w-full z-50 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-headline-md text-headline-md font-bold text-primary tracking-tighter uppercase leading-none">Nuara</span>
          {session.is_locked && (
            <>
              <div className="h-4 w-px bg-outline-variant mx-2"></div>
              <span className="font-mono-data text-mono-data text-error uppercase tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                SYSTEM_LOCKDOWN_ACTIVE
              </span>
            </>
          )}
        </div>

        <div className="flex-1 flex justify-end items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="text-on-surface-variant hover:bg-surface-variant transition-colors p-1 cursor-pointer active:opacity-80 relative">
              <span className="material-symbols-outlined text-[20px]">security</span>
              {session.is_locked && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-error rounded-full"></span>}
            </button>
            <button className="text-on-surface-variant hover:bg-surface-variant transition-colors p-1 cursor-pointer active:opacity-80">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </button>
            <button className="text-on-surface-variant hover:bg-surface-variant transition-colors p-1 cursor-pointer active:opacity-80">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>
          </div>
          <div className={`h-8 w-8 bg-surface-variant border flex items-center justify-center overflow-hidden relative ${session.is_locked ? "border-error grayscale" : "border-outline-variant"}`}>
            <img 
              alt="User profile pic" 
              className="w-full h-full object-cover opacity-80" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxLZcDZORcOiyFw4RwzqdyHu23osZeSSd-vfKB3WsK0QuRUYCbC1R39ms7GfXz5H7t0CXE0K7FfO_0PPfe32vOwkCOv5EGcvDJENkAACxGtXpGG3xhv48VhgqV8KiIsMTqvfzKoYxdoCNEBcnvFfm_5gCZAknJLPMuQBVzvK9v_W3FstCBHUCQqx2oCZny7JXxFtDu8JT--8kJtm1T0UmitVkDnlR_BJi_MEyTuUbWF-WtAjZ0WJIy4yA2l1fr9zkX0muHKd40_g"
            />
            {session.is_locked && <div className="absolute inset-0 bg-error/20 mix-blend-overlay"></div>}
            {!session.is_locked && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary border-2 border-surface rounded-full"></div>}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <nav className="bg-surface-container-low border-r border-outline-variant w-64 flex flex-col h-full z-40 shrink-0">
          <div className="p-panel-padding border-b border-outline-variant">
            <div className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant mb-1">Nuara Core</div>
            <div className={`font-mono-data text-mono-data ${session.is_locked ? "text-error" : "text-primary"}`}>
              {session.is_locked ? "Auth: INVALIDATED" : `Clearance: ${session.clearance}`}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-panel-padding">
            <div className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant mb-4">Data Source Vault</div>
            <ul className="space-y-2 ml-2">
              <li className="flex flex-col">
                <div className="flex items-center justify-between group cursor-pointer hover:bg-surface-container-high p-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline-variant text-[16px]">folder_open</span>
                    <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">Drives</span>
                  </div>
                  <span className="bg-surface-container px-1 py-0.5 text-[10px] text-tertiary border border-outline-variant">PUBLIC</span>
                </div>
                <ul className="ml-6 mt-1 space-y-1 tree-line">
                  <li 
                    onClick={() => selectDocumentQuery("Q3_Report.pdf", "QUERY: Adopted hybrid RAG model for latency")}
                    className="flex items-center gap-2 text-on-surface-variant hover:text-primary cursor-pointer p-1 text-[11px]"
                  >
                    <span className="material-symbols-outlined text-[14px]">description</span> Q3_Report.pdf
                  </li>
                  <li 
                    onClick={() => selectDocumentQuery("Architecture_v2.docx", "QUERY: Retrieve RAG architecture decisions from Q3 planning")}
                    className="flex items-center gap-2 text-on-surface-variant hover:text-primary cursor-pointer p-1 text-[11px]"
                  >
                    <span className="material-symbols-outlined text-[14px]">description</span> Architecture_v2.docx
                  </li>
                </ul>
              </li>

              <li className="flex flex-col mt-2">
                <div className="flex items-center justify-between group cursor-pointer hover:bg-surface-container-high p-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline-variant text-[16px]">folder_open</span>
                    <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">Wikis</span>
                  </div>
                  <span className="bg-surface-container px-1 py-0.5 text-[10px] text-primary border border-outline-variant">ENG</span>
                </div>
              </li>

              <li className="flex flex-col mt-2">
                <div className="flex items-center justify-between group cursor-pointer hover:bg-surface-container-high p-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline-variant text-[16px]">folder_open</span>
                    <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">Tickets</span>
                  </div>
                  <span className="bg-surface-container px-1 py-0.5 text-[10px] text-error border border-outline-variant">HR</span>
                </div>
              </li>

              <li className="flex flex-col mt-2">
                <div className={`flex items-center justify-between group cursor-pointer p-1 ${session.is_locked ? "bg-error/10 border-l-2 border-error" : "bg-secondary-container border-l-2 border-primary"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[16px] ${session.is_locked ? "text-error" : "text-primary"}`}>folder_open</span>
                    <span className={`font-body-sm text-body-sm ${session.is_locked ? "text-error" : "text-primary"}`}>Chat Logs</span>
                  </div>
                  <span className={`bg-surface-container px-1 py-0.5 text-[10px] border ${session.is_locked ? "text-error border-error" : "text-error border-outline"}`}>EXEC</span>
                </div>
                <ul className="ml-6 mt-1 space-y-1 tree-line">
                  <li 
                    onClick={() => selectDocumentQuery("slack_#eng_leads", "QUERY: CEO comments on permissions gateway")}
                    className="flex items-center gap-2 text-primary cursor-pointer p-1 text-[11px]"
                  >
                    <span className="material-symbols-outlined text-[14px]">chat</span> #strategy-2025
                  </li>
                  <li 
                    onClick={() => selectDocumentQuery("HR_Salaries_FY24", "QUERY: What is the average bonus for L5 engineers?")}
                    className={`flex items-center gap-2 cursor-pointer p-1 text-[11px] border rounded-sm ${session.is_locked ? "text-error bg-error/10 border-error" : "text-on-surface-variant border-transparent"}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">lock</span> [HR_Salaries_FY24]
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div className="p-panel-padding border-t border-outline-variant bg-surface-dim">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Role Switcher</span>
              <span className="material-symbols-outlined text-primary text-[14px]">swap_vert</span>
            </div>
            <div className="space-y-1.5">
              <div 
                onClick={() => switchUser("Node_02")}
                className={`border p-2 flex items-center justify-between cursor-pointer transition-colors ${session.user_id === "Node_02" ? "border-primary bg-surface-container-high" : "border-outline-variant hover:border-primary"}`}
              >
                <div className="flex flex-col">
                  <span className="font-mono-data text-mono-data text-on-surface text-[12px]">Software Engineer</span>
                  <span className="text-[10px] text-primary opacity-80">Node_02 // Active</span>
                </div>
              </div>
              <div 
                onClick={() => switchUser("HR_Lead")}
                className={`border p-2 flex items-center justify-between cursor-pointer transition-colors ${session.user_id === "HR_Lead" ? "border-primary bg-surface-container-high" : "border-outline-variant hover:border-primary"}`}
              >
                <div className="flex flex-col">
                  <span className="font-mono-data text-mono-data text-on-surface text-[12px]">HR Lead</span>
                  <span className="text-[10px] text-tertiary opacity-80">HR_Manager // Active</span>
                </div>
              </div>
              <div 
                onClick={() => switchUser("CEO_Alpha")}
                className={`border p-2 flex items-center justify-between cursor-pointer transition-colors ${session.user_id === "CEO_Alpha" ? "border-primary bg-surface-container-high" : "border-outline-variant hover:border-primary"}`}
              >
                <div className="flex flex-col">
                  <span className="font-mono-data text-mono-data text-on-surface text-[12px]">CEO Executive</span>
                  <span className="text-[10px] text-error opacity-80">Executive // Active</span>
                </div>
              </div>
            </div>
            {session.is_locked && (
              <button 
                onClick={handleReset}
                className="w-full mt-3 bg-error-container/20 border border-error text-error font-label-md text-label-md uppercase tracking-widest py-2 hover:bg-error-container hover:text-on-error-container transition-colors shadow-[0_0_10px_rgba(147,0,10,0.5)] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">warning</span> ACKNOWLEDGE_ALERT
              </button>
            )}
          </div>
        </nav>

        <section className="flex-1 bg-surface-container-lowest flex flex-col min-w-0 border-r border-outline-variant">
          <div className="p-panel-padding border-b border-outline-variant bg-surface-container-low flex flex-col gap-2">
            <div className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">terminal</span> Command Center
            </div>
            <form onSubmit={handleQuery} className="flex items-center border-b border-outline-variant focus-within:border-primary transition-colors py-1">
              <span className="text-primary mr-2 font-mono-data text-mono-data">&gt;</span>
              <input 
                className={`w-full bg-transparent border-none outline-none font-mono-data text-mono-data placeholder:text-on-surface-variant focus:ring-0 p-0 ${session.is_locked ? "text-error" : "text-on-surface"}`}
                placeholder={session.is_locked ? "SYS_HALT: OVERRIDE_REQUIRED" : "QUERY: Search corporate memory graph..."}
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={session.is_locked}
              />
              <button 
                type="submit" 
                disabled={session.is_locked || isLoading}
                className={`px-2 py-0.5 text-[10px] font-bold transition-all ${session.is_locked ? "bg-error/30 text-error-container border border-error cursor-not-allowed" : "bg-primary text-on-primary hover:bg-primary-container cursor-pointer"}`}
              >
                {isLoading ? "RUNNING" : "EXECUTE"}
              </button>
            </form>
          </div>

          <div className="flex-1 p-panel-padding overflow-y-auto flex flex-col gap-4">
            <div className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Multi-Agent Orchestration Chain</div>
            <div className="flex flex-col gap-3 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-outline-variant z-0"></div>

              <div className={`border p-3 flex gap-3 relative z-10 transition-all ${
                results && results.status !== "breach" 
                  ? "bg-surface-container-low border-outline-variant opacity-70" 
                  : "bg-surface-container-low border-outline-variant opacity-50"
              }`}>
                <div className="w-8 h-8 rounded-none bg-surface border border-outline-variant flex items-center justify-center shrink-0">
                  {results ? (
                    <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-outline-variant text-[18px]">pending</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono-data text-mono-data text-on-surface">Planner Agent</span>
                    {results && <span className="text-[10px] text-outline">12ms</span>}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    {results 
                      ? (results.status === "breach" ? "Deconstructed query into 2 sub-tasks. Security context resolved." : "Deconstructed query into 3 sub-tasks. Required sources identified.")
                      : "Awaiting query payload to begin planning sequence."
                    }
                  </div>
                </div>
              </div>

              <div className={`border p-3 flex gap-3 relative z-10 transition-all ${
                isLoading 
                  ? "bg-surface border-primary shadow-[0_0_15px_rgba(76,215,246,0.1)]" 
                  : results && results.status === "breach" 
                    ? "bg-error-container/10 border-error" 
                    : results 
                      ? "bg-surface-container-low border-outline-variant opacity-70" 
                      : "bg-surface-container-low border-outline-variant opacity-50"
              }`}>
                <div className={`w-8 h-8 rounded-none bg-surface border flex items-center justify-center shrink-0 ${isLoading ? "border-primary" : results && results.status === "breach" ? "border-error" : "border-outline-variant"}`}>
                  {isLoading ? (
                    <span className="material-symbols-outlined text-primary text-[18px] animate-spin">refresh</span>
                  ) : results && results.status === "breach" ? (
                    <span className="material-symbols-outlined text-error text-[18px]">gpp_bad</span>
                  ) : results ? (
                    <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-outline-variant text-[18px]">pending</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-mono-data text-mono-data ${isLoading ? "text-primary" : results && results.status === "breach" ? "text-error" : "text-on-surface"}`}>
                      Knowledge Graph Retrieval Engine
                    </span>
                    {isLoading && <span className="text-[10px] text-primary animate-pulse">Running...</span>}
                    {results && results.status === "breach" && <span className="text-[10px] text-error font-bold">BLOCKED</span>}
                    {results && results.status !== "breach" && <span className="text-[10px] text-outline">450ms</span>}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    {isLoading ? "Traversing graph edges within [Drives, Wikis, Tickets, Chat]..." 
                      : results && results.status === "breach" ? "Traversing graph edges... Access Denied: User role lacks clearance."
                      : results ? "Traversing graph edges completed. Found matching nodes." 
                      : "Awaiting planning schema to resolve connections."
                    }
                  </div>
                  {results && results.status !== "breach" && results.documents && (
                    <div className="bg-surface-container-lowest border border-outline-variant p-2 text-[10px] font-mono-data text-tertiary mt-2">
                      <div>&gt; match (n:Document)-[:MENTIONS]-&gt;(e:Concept)</div>
                      <div>&gt; where n.access_level &lt;= '{session.clearance}'</div>
                      <div className="text-primary">&gt; [Stream active: {results.documents.length} nodes found]</div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`border p-3 flex gap-3 relative z-10 transition-all ${
                results && results.status !== "breach" 
                  ? "bg-surface-container-low border-outline-variant opacity-70" 
                  : "bg-surface-container-low border-outline-variant opacity-50"
              }`}>
                <div className="w-8 h-8 rounded-none bg-surface border border-outline-variant flex items-center justify-center shrink-0">
                  {results && results.status === "breach" ? (
                    <span className="material-symbols-outlined text-outline-variant text-[18px]">cancel</span>
                  ) : results ? (
                    <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-outline-variant text-[18px]">pending</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono-data text-mono-data text-on-surface-variant">Synthesis Agent</span>
                    {results && results.status !== "breach" && <span className="text-[10px] text-outline">180ms</span>}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    {results && results.status === "breach" ? "Execution halted due to security violation exception."
                      : results ? "Awaiting retrieval payload... Final response synthesized."
                      : "Awaiting retrieval payload to compile final response."
                    }
                  </div>
                </div>
              </div>
            </div>

            {results && results.status !== "breach" && results.documents && results.documents.length > 0 && (
              <div className="mt-4 border border-outline-variant bg-surface-container-low p-4">
                <h3 className="text-primary font-label-md uppercase tracking-wider mb-2">Synthesized Answer</h3>
                <div className="text-on-surface font-body-md leading-relaxed">
                  {results.documents[0].content} 
                  <span className="text-primary font-bold ml-1 text-xs">
                    [{results.documents[0].name}]
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="h-48 border-t border-outline-variant bg-[#0a0e18] flex flex-col shrink-0">
            <div className="bg-surface-container-high px-2 py-1 flex items-center justify-between border-b border-outline-variant">
              <span className="text-[10px] font-mono-data text-on-surface-variant">system_logs.json</span>
              <span className="material-symbols-outlined text-[14px] text-outline-variant hover:text-primary cursor-pointer">open_in_full</span>
            </div>
            <div className="p-2 overflow-y-auto text-[11px] font-mono-data leading-relaxed text-on-surface-variant flex flex-col gap-0.5">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`flex gap-4 ${
                    log.level === "WARN" ? "text-error bg-error-container/5 -mx-2 px-2 border-l border-error" : 
                    log.level === "DEBUG" ? "text-tertiary" : ""
                  }`}
                >
                  <span className="opacity-50 select-none whitespace-nowrap">{log.timestamp.split("T")[1]?.slice(0, 8) || log.timestamp}</span>
                  <span className="text-secondary">[{log.component}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </section>

        <aside className="w-80 bg-surface-container-low flex flex-col z-30 shrink-0 relative">
          {session.is_locked ? (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-surface-container-lowest/80 backdrop-blur-md border-l border-error/50">
              <div aria-hidden="true" className="absolute inset-0 opacity-10 font-mono-data text-[8px] text-error overflow-hidden break-all leading-none z-0" style={{ userSelect: "none" }}>
                01000100 01000101 01001110 01001001 01000101 01000100 00100000 01000001 01000011 01000011 01000101 01010011 01010011 00100000 01010110 01001001 01001111 01001100 01000001 01010100 01001001 01001111 01011010
              </div>
              <div className="relative z-10 text-center border border-error bg-background p-6 shadow-[0_0_30px_rgba(147,0,10,0.2)]">
                <span className="material-symbols-outlined text-5xl text-error mb-4">gpp_bad</span>
                <h2 className="font-headline-md text-error tracking-widest uppercase mb-2">RESTRICTED ZONE</h2>
                <div className="font-mono-data text-error-container text-xs mb-4">ERR_CODE: PERMISSION_DENIED_0x403</div>
                <div className="w-full h-px bg-error/30 my-4"></div>
                <p className="font-body-sm text-on-surface-variant text-center opacity-80 mb-6">
                  Insight Ledger visualization unavailable. The requested knowledge graph nodes require Executive or HR clearance.
                </p>
                <button 
                  onClick={() => switchUser("CEO_Alpha")}
                  className="px-4 py-2 border border-error text-error font-label-md uppercase hover:bg-error hover:text-on-error transition-colors w-full cursor-pointer"
                >
                  REQUEST ELEVATION
                </button>
              </div>
            </div>
          ) : null}

          <div className="p-panel-padding border-b border-outline-variant bg-surface-dim flex justify-between items-center">
            <div className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">query_stats</span> Insight Ledger
            </div>
            <div className="px-2 py-0.5 bg-primary-container text-on-primary-container border border-primary text-[10px] font-mono-data flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">verified_user</span> VALIDATED
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-panel-padding flex flex-col gap-6">
            <div>
              <div className="text-[10px] uppercase text-outline-variant tracking-wider mb-2 font-bold font-headline-md">Verified Citations</div>
              <div className="flex flex-col gap-2">
                {results && results.status !== "breach" && results.documents && results.documents.map((doc) => (
                  <div key={doc.id} className="bg-surface border border-outline-variant p-2 hover:border-primary transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[14px] text-tertiary">description</span>
                      <span className="text-[11px] font-mono-data text-on-surface group-hover:text-primary">{doc.name}</span>
                    </div>
                    <div className="text-[10px] text-on-surface-variant bg-surface-container p-1 font-mono-data truncate">
                      Source: {doc.url}
                    </div>
                  </div>
                ))}
                {(!results || results.status === "breach") && (
                  <div className="text-on-surface-variant text-[11px] font-mono-data">No active citations loaded. Execute a successful query to view verification logs.</div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="text-[10px] uppercase text-outline-variant tracking-wider mb-2 font-bold font-headline-md">Org Knowledge Graph</div>
              <div className="flex-1 bg-surface-container-lowest border border-outline-variant relative overflow-hidden min-h-[220px]">
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="relative w-full h-full">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ stroke: "#3d494c", strokeWidth: "1px" }}>
                      <line x1="50%" x2="20%" y1="20%" y2="60%"></line>
                      <line x1="50%" x2="80%" y1="20%" y2="60%"></line>
                      <line x1="50%" x2="50%" y1="20%" y2="80%"></line>
                      <line className="dash-anim" style={{ stroke: "#4cd7f6", strokeWidth: "1.5px" }} x1="50%" x2="20%" y1="20%" y2="60%"></line>
                    </svg>

                    <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-primary-container border border-primary flex items-center justify-center rounded-none shadow-[0_0_10px_rgba(76,215,246,0.3)] z-10">
                      <span className="material-symbols-outlined text-[12px] text-on-primary-container">hub</span>
                    </div>
                    <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-8 text-[9px] font-mono-data text-primary">Query</div>

                    <div className="absolute top-[60%] left-[20%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-surface border border-outline-variant flex items-center justify-center rounded-none z-10 hover:border-primary cursor-pointer">
                      <span className="material-symbols-outlined text-[10px] text-on-surface">description</span>
                    </div>
                    <div className="absolute top-[60%] left-[20%] -translate-x-1/2 translate-y-4 text-[9px] font-mono-data text-on-surface-variant">arch_04.md</div>

                    <div className="absolute top-[60%] left-[80%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-surface border border-outline-variant flex items-center justify-center rounded-none z-10">
                      <span className="material-symbols-outlined text-[10px] text-on-surface">person</span>
                    </div>
                    <div className="absolute top-[60%] left-[80%] -translate-x-1/2 translate-y-4 text-[9px] font-mono-data text-on-surface-variant">Standard_Eng</div>

                    <div className="absolute top-[80%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-surface border border-outline-variant flex items-center justify-center rounded-none z-10">
                      <span className="material-symbols-outlined text-[10px] text-on-surface">forum</span>
                    </div>
                    <div className="absolute top-[80%] left-[50%] -translate-x-1/2 translate-y-4 text-[9px] font-mono-data text-on-surface-variant">Slack</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
