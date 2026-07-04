# NexusBrain System Architecture

## 1. System Overview
NexusBrain is a secure enterprise workspace that unifies Drives, Wikis, and Chat logs using Graph-Augmented Retrieval-Augmented Generation (GraphRAG). By integrating structural databases with vector stores and semantic query routing, the platform resolves workspace context and presents relevant documentation while enforcing access policies.

## 2. The Core Tech Stack
The workspace is constructed using modern enterprise engineering layers:
- **Frontend Layer**: React SPA compiled with Vite, styled with Tailwind CSS, utilizing responsive flex grids.
- **Backend Layer**: FastAPI web server hosting RAG pipelines and administration controls.
- **Database Layer (Transactional)**: PostgreSQL handling audit logging and file records.
- **Database Layer (Vector Store)**: Qdrant / pgvector hosting dense text embeddings.
- **Database Layer (Graph Network)**: Neo4j mapping relational data schemas.
- **Agent Orchestration**: LangGraph executing multi-agent validation chains.

## 3. Key Innovations

### Innovation 1: Permission-Integrated Intelligence
Enterprise data security is enforced at retrieval time. The IAM gateway checks access control list (ACL) clearances (PUBLIC, ENG, HR, EXEC) of the requesting user prior to running RAG synthesis, preventing unauthorized data leaks and keeping documents isolated.

### Innovation 2: Auditable Agent Transparency
Multi-agent validation chains execute structured sequences. Every RAG traversal compiles step-by-step transaction logs (e.g. Planning, Graph Search, Synthesis) that are pushed directly to the UI panel, allowing full visibility into agent routing.

### Innovation 3: Org-Wide Decision Memory
The Neo4j graph store maps conceptual entities and document connections. This relational model links files to historical project decisions and Slack conversations, allowing users to discover why decisions were made, not just where they are recorded.
