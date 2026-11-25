// Scope of the official guide v1.1 (from Dec 7) for CCAO-F, CCDV-F and CCAR-P. Objective names are the guide headings; the part after ":" is our own summary.
// When an exam is set to "from Dec 7", BLUEPRINT[ex] domains and items are swapped for this (js/app.js bp()).
// Existing questions are assigned to these numbers in data/map-11.js. Questions added for v1.1 are in data/<lang>/n-*.js.
(function () {
  var B = window.BLUEPRINT;
  B.ccao.v11 = { from: '2026-12-07', items: 70, scored: 60, domains: [
    { id: 1, name: 'Task Definition and Prompting', en: 'Task Definition and Prompting', weight: 15, objectives: [
      'Prompt Construction: turn the goal, audience, constraints and source material into a first response that is fit for purpose',
      'Task Decomposition and Sequencing: split large deliverables into stages, match the approach to the task type, and check between steps',
      'Prompt Diagnosis and Iteration: trace a weak output to a specification gap and decide whether to iterate, restart or change approach',
    ]},
    { id: 2, name: 'Output Evaluation and Quality Control', en: 'Output Evaluation and Quality Control', weight: 20, objectives: [
      'Output Evaluation and Fitness for Purpose: check against requirements and sources, then classify as ready to use, needs revision, or needs human correction',
      'Hallucination Detection and Verification: spot unsupported citations and specifics, and confirm them at the source before use',
      'Review Depth and Escalation: set how deep to review from the cost of an error and whether it is an internal draft or goes outside',
      'Output Adaptation and Format Selection: adapt for the audience and channel, choosing inline, artifacts, structured data, code execution or a Skill',
    ]},
    { id: 3, name: 'Capability, Model, and Context Selection', en: 'Capability, Model, and Context Selection', weight: 15, objectives: [
      'Capability Selection: pick the right mix of chat, Projects, Artifacts, research, code execution, Skills, connectors and memory',
      'Model and Effort Selection: choose the model tier and effort level by quality, speed and cost, and defend it against the alternatives',
      'Context and Memory Management: know when to restart, summarize, keep it in a Project or rely on memory, and keep memory clean',
    ]},
    { id: 4, name: 'Workflow Design and Integration', en: 'Workflow Design and Integration', weight: 18, objectives: [
      'End-to-End Deliverable Workflows: carry a deliverable from requirements through cited research and code-executed analysis to an actionable plan',
      'Delegation and Workflow Redesign: use reversibility, stakes, human judgment and accountability to decide what AI does, what people keep, and what people review',
      'Repeatable Workflow Design: use Projects, Skills and connectors so a recurring task gives the same result whoever runs it',
      'Capability Communication: tell people new to AI what Claude can and cannot do, and what oversight stays, without overselling',
    ]},
    { id: 5, name: 'Configuration and Knowledge Management', en: 'Configuration and Knowledge Management', weight: 15, objectives: [
      'Project Configuration: decide for each requirement whether it belongs in instructions, knowledge, a Skill or scoped memory',
      'Connector and Knowledge Management: choose upload or connector, and keep connected knowledge current and relevant',
      'Persistent-Instruction Design: put behavior you want every time in standing instructions, and one-off needs in the request',
      'Configuration Lifecycle and Degradation: trace a drop in quality to instructions, stale knowledge, Skill versions or accumulated memory',
    ]},
    { id: 6, name: 'Responsible Use, Data Protection, and Governance', en: 'Responsible Use, Data Protection, and Governance', weight: 17, objectives: [
      'Use-Case Appropriateness: weigh delegation limits, trust in third-party Skills and connectors, and the Usage Policy to classify a use case as appropriate, appropriate with safeguards, or inappropriate',
      'Data Protection in Practice: classify, redact and anonymize, decide what may be uploaded for code execution, and use memory and incognito controls as policy says',
      'Policy, Ethics, and Diligence: find where usage departs from policy and tell a policy gap from a training gap before fixing it',
    ]},
  ]};
  B.ccdv.v11 = { from: '2026-12-07', items: 70, scored: 60, domains: [
    { id: 1, name: 'Agents and Workflows', en: 'Agents and Workflows', weight: 17, objectives: [
      'Architecture and Runtime Selection: choose workflow or agent by requirements, error tolerance and audit needs, and a self-hosted harness or a managed sandboxed runtime',
      'Agent SDK Construction and Hooks: write and fix agent definitions, custom loops and hooks so required actions never depend on the model choosing them',
      'Agent Pattern Diagnosis: read a trace to find the missing pattern, such as loop termination, subagent isolation, memory or context management',
    ]},
    { id: 2, name: 'Applications and Integration', en: 'Applications and Integration', weight: 20, objectives: [
      'Messages API Mechanics: message structure, tools, streaming, vision, thinking, caching, structured output, stop reasons, and realtime versus batch',
      'Application Boundary and Surface Behavior: how each surface reads instructions, what crosses the boundary, and schema and session decisions',
      'Configuration and SDLC Integration: CLAUDE.md, settings.json, model pinning, prompt versions, plugin dependencies and CI, and how a change hits each environment',
      'Integration Resilience: terminal streaming events, retries by error class (rate limit, overloaded, invalid request, timeout), and Files API ingestion',
    ]},
    { id: 3, name: 'Claude Code', en: 'Claude Code', weight: 8, objectives: [
      'Claude Code Operation: CLI, desktop, IDE, web and mobile; sessions, the CLAUDE.md hierarchy, settings.json, permission modes, headless mode and built-in commands',
      'Claude Code Customization and Extension: choose among Skill, plugin, Rules file, hook, subagent and slash command, and package it for others',
    ]},
    { id: 4, name: 'Eval, Testing, and Debugging', en: 'Eval, Testing, and Debugging', weight: 10, objectives: [
      'Evaluation Design: measure a quality goal with an LLM judge calibrated on human labels, golden sets, regression tests and behavioral checks',
      'Failure-Mode Diagnosis: tell hallucination, refusal, under-acting, context loss and format drift apart, and whether the cause is integration or model output',
    ]},
    { id: 5, name: 'Model Selection and Optimization', en: 'Model Selection and Optimization', weight: 12, objectives: [
      'Generation Mechanics and Model Options: use tokens, context windows, sampling, non-determinism, adaptive thinking and effort to predict and control behavior',
      'Model Tier Selection and Release Planning: choose by quality, latency and cost, and prepare for new releases with regression evals',
      'Cost Diagnosis and Optimization: find the main cost driver and cut it with cache breakpoints (single, layered, rolling), batching or token budgets',
    ]},
    { id: 6, name: 'Prompt and Context Engineering', en: 'Prompt and Context Engineering', weight: 15, objectives: [
      'Context Management for Long-Running Sessions: fix bloat and drift with compaction, pruning tool output, subagents or a fresh session',
      'Prompt Revision: close gaps found by regression evals with clearer instructions, system versus user placement, examples, output constraints and input sanitizing',
      'Structured Output and Defensive Parsing: strict schemas, response validation and safe parsing of free-text fallbacks to protect downstream code',
      'Grounding and Source Citation: answer only from supplied documents, cite them, return "not found" when absent, and choose full context or retrieval',
    ]},
    { id: 7, name: 'Security and Safety', en: 'Security and Safety', weight: 8, objectives: [
      'Prompt Injection and Jailbreak Defense: layer defenses for agents that read untrusted content without breaking what they do',
      'Deterministic Guardrails and Least Privilege: use hooks and least privilege so destructive actions cannot run whatever the instruction',
      'API Key and Credential Handling: proxy on the server, use workspace-scoped keys, separate environments, rotate and monitor',
    ]},
    { id: 8, name: 'Tools and MCP', en: 'Tools and MCP', weight: 10, objectives: [
      'Tool Design and Response Shaping: schema, a description that drives correct calls, short actionable results, errors, execution side, approvals and tool-set assembly',
      'MCP Server Development and Integration: resources, tools and prompts; stdio or HTTP; authentication',
      'Capability Mechanism Selection: choose built-in tools, custom tools, Skills or MCP by where it lives, who maintains it and how Claude finds it',
    ]},
  ]};
  B.ccarp.v11 = { from: '2026-12-07', items: 70, scored: 60, domains: [
    { id: 1, name: 'Solution Design and Architecture', en: 'Solution Design and Architecture', weight: 18, objectives: [
      'Task Delegation Between Claude and Humans: assign each step to Claude, people, or both by reversibility, stakes and accountability',
      'End-to-End Architecture Evaluation: check scale, maintainability and access control, and find the component that fails first under load or trust conditions',
      'Architectural Pattern Selection: choose workflow, agentic, augmented-LLM or Skills-based patterns by reuse, governance and risk',
      'Orchestrator and Subagent Decomposition: find where boundaries, control flow or result synthesis will fail against observability and recovery needs',
      'Value-Based Architectural Decisions: pick the option with the largest measurable outcome under a cost or SLA ceiling',
      'Deployment Surface and Agent Runtime Selection: Anthropic API, Bedrock, Vertex AI or Foundry, and a Messages API loop, Agent SDK or headless Claude Code, or Managed Agents',
    ]},
    { id: 2, name: 'Claude Models, Prompting, and Context Engineering', en: 'Claude Models, Prompting, and Context Engineering', weight: 13, objectives: [
      'Model Tier Selection: pick the tier that meets every latency, cost and quality constraint, and say why each alternative fails',
      'System Prompt Diagnosis and Revision: find the underspecification behind drifting output and fix it without over-constraining',
      'Prompting Technique Selection: zero-shot, few-shot, prompted reasoning or native thinking, and structured output, without wasted tokens',
      'Context Composition and Token Economics: find where tokens can be cut for a budget and call volume without losing what the task needs',
      'Cache Breakpoints and Reusable Packaging: put stable content before dynamic content and package it as modules or Skills',
      'Reasoning Effort and Context Lifecycle: allocate effort and choose context editing, the memory tool or compaction for long-running agents',
    ]},
    { id: 3, name: 'Integration', en: 'Integration', weight: 21, objectives: [
      'Least-Privilege Tool Configuration: decide which tool connections to remove, scope down or replace with a context-efficient pattern',
      'Authentication and Authorization Posture: find credential exposure and privilege escalation risks and specify each mitigation',
      'Relieving the Binding Performance Constraint: ease the accuracy or latency constraint at the least cost to the other',
      'Instrumentation and Monitoring Gaps: from a missed failure, find the missing instrumentation and the monitoring that would have caught it',
      'Retrieval Architecture Selection: pre-built RAG, agentic search with tools, or full-corpus context, plus contextual retrieval and fallback when indexing',
      'Connection Mechanism Selection: MCP, direct API/CLI or agent-to-agent handoff by latency, security and state',
      'Progressive Discovery vs. Monolithic Context Loading: load on demand or load everything up front',
      'Production Reliability Controls: rate-limit handling, retry and backoff, idempotency for side-effecting tools, and fallback routing without duplicate effects',
    ]},
    { id: 4, name: 'Evaluation, Testing, and Optimization', en: 'Evaluation, Testing, and Optimization', weight: 17, objectives: [
      'Evaluation Coverage Gaps: from a failure that reached production, find the missing metric (accuracy, groundedness, latency, cost, safety, security)',
      'Deriving Evaluations from Business Processes: build evals for model changes, prompt changes and release gates from the business outcome',
      'LLM-as-Judge Design and Bias: spot position, verbosity, self-preference and judge drift and correct them',
      'Experimental Design for Configuration Comparison: set trials per case to separate the configuration effect from run-to-run variance',
      'Root-Cause Isolation from Logs and Traces: narrow the cause to prompt, retrieval, hallucination, tool or subagent error, or model mismatch',
      'Cost and Latency Optimization: use telemetry such as cache hit rates to find where spend and latency concentrate, and cut them above the quality floor',
      'Model Version Migration: from the deprecation timeline and regression results, choose to pin, re-tune prompts, re-baseline evals or defer',
    ]},
    { id: 5, name: 'Governance, Safety, and Risk Management', en: 'Governance, Safety, and Risk Management', weight: 16, objectives: [
      'Guardrail Placement: close a misuse path without hurting a legitimate use',
      'Prompt Injection Surface and Controls: keep retrieved documents, tool results, MCP responses and third-party Skills from being treated as instructions',
      'Risk Assessment and Ranking: rank attack surface, failure modes, token and quota exhaustion, and dependency and supply-chain risk by exposure',
      'Human-in-the-Loop Checkpoints: pause before irreversible or high-stakes actions without stalling acceptable-risk paths',
      'Architectural Controls for Compliance Obligations: data residency, retention and ZDR, PII detection and redaction, audit logging, tenant isolation',
      'Bias Source Identification and Mitigation: tell data bias from prompt-framing and evaluation-design bias and fix the right one',
    ]},
    { id: 6, name: 'Stakeholder Communication and Lifecycle Management', en: 'Stakeholder Communication and Lifecycle Management', weight: 7, objectives: [
      'Unsupportable Commitments in Requirements and SLAs: find a promise the design cannot keep and resolve it by clarifying or changing the design',
      'Architecture Decision Records: find the unmet constraint and make the trade-off and residual risk explicit without overstating model behavior',
      'Operational Handoff Completeness: fill the missing assumption, dependency or runbook step that would block the receiving team',
    ]},
    { id: 7, name: 'Developer Productivity and Operational Enablement', en: 'Developer Productivity and Operational Enablement', weight: 8, objectives: [
      'Packaging and Distributing Claude Code Workflows: plugin contents (skills, hooks, subagents, commands, MCP), marketplaces and managed settings, and what to enforce centrally',
      'Agent SDK and Claude Code Configuration: permission modes (default, acceptEdits, plan, auto, dontAsk, bypassPermissions), hooks, subagents, headless and CI',
      'Accountability for AI-Generated Code: the review and controls that keep people as the owners of AI-generated code',
    ]},
  ]};
})();
