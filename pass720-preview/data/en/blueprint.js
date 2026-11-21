// Exam blueprints (English). Domain names, weights and objectives follow the published exam guides.
// Same shape as data/ja/blueprint.js: questions use d = domain id, o = index into objectives (from 0).
// `ja` is the short display name shown on the home list (kept under this key so app.js is shared).
window.BLUEPRINT = {
  ccao: {
    code: 'CCAO-F', short: 'Associate',
    name: 'Claude Certified Associate – Foundations',
    ja: 'Associate – Foundations',
    who: 'For people who use Claude as a work tool (operations, marketing, project management, education). APIs and agent design are out of scope.',
    items: 60, minutes: 120, fee: '$99', pass: 720,
    guide: {
      en: 'https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946524/Claude_Certified_Associate_-_Foundations_Exam_Guide.pdf',
      nextEn: 'https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946609/Claude_Certified_Associate_-_Foundations_Exam_Guide_Updated_Dec_7.pdf',
    },
    next: { from: '2026-12-07', items: '70 questions (60 scored + 10 unscored)',
      summary: 'Seven domains become six. "Troubleshooting and Optimization" disappears as a domain; its content moves into prompt diagnosis and iteration (Domain 1) and the configuration lifecycle (Domain 5). New weights: 15 / 20 / 15 / 18 / 15 / 17. The guide now names effort levels, Skills, connectors, memory and incognito chats, delegation criteria (reversibility, stakes, human judgment, accountability) and trust in third-party Skills. It also states that memorizing published numbers (prices, context lengths, rate limits) is not tested.',
      domains: ['1 Task Definition and Prompting 15%', '2 Output Evaluation and Quality Control 20%', '3 Capability, Model, and Context Selection 15%', '4 Workflow Design and Integration 18%', '5 Configuration and Knowledge Management 15%', '6 Responsible Use, Data Protection, and Governance 17%'] },
    domains: [
      { id: 1, name: 'Prompting and Task Execution', en: 'Prompting and Task Execution', weight: 14, objectives: [
        'Create effective prompts for business and technical tasks',
        'Apply task decomposition techniques to structure complex requests',
        'Iterate prompts to improve output quality',
        'Adapt prompting strategies based on task type (analysis, research, drafting, brainstorming)',
      ]},
      { id: 2, name: 'Output Evaluation and Validation', en: 'Output Evaluation and Validation', weight: 21, objectives: [
        'Evaluate Claude-generated outputs for accuracy and completeness',
        'Identify hallucinations, inconsistencies, and biases in responses',
        'Apply fact-checking and validation techniques',
        'Determine when human review or additional verification is required',
        'Edit, adapt, refine, and compare outputs for the intended audience',
        'Organize and curate information and select appropriate output formats (artifacts, inline, structured data)',
      ]},
      { id: 3, name: 'Product and Model Selection', en: 'Product and Model Selection', weight: 12, objectives: [
        'Select appropriate Claude product features (Projects, research mode, chat, artifacts)',
        'Differentiate between Claude model types (Haiku, Sonnet, Opus)',
        'Align model selection with task requirements (cost, speed, quality)',
        'Understand and manage context limitations and memory considerations (when to restart, summarize, or persist)',
      ]},
      { id: 4, name: 'Workflow Integration and Solution Design', en: 'Workflow Integration and Solution Design', weight: 16, objectives: [
        'Apply Claude to analyze requirements and use cases',
        'Leverage Claude for research, planning, and process optimization',
        'Use Claude to support solution design, development, and iteration',
        'Integrate Claude into existing workflows to augment or redesign them',
        "Communicate Claude's value and limitations to stakeholders",
      ]},
      { id: 5, name: 'Configuration and Knowledge Management', en: 'Configuration and Knowledge Management', weight: 12, objectives: [
        'Configure Claude Projects with instructions and knowledge sources',
        'Manage uploaded knowledge and connectors (e.g., Google Drive, Gmail)',
        'Create effective system-level instructions',
        'Inform, maintain, and update Claude configurations, knowledge sources, and instructions',
      ]},
      { id: 6, name: 'Governance, Risk, and Responsible Use', en: 'Governance, Risk, and Responsible Use', weight: 15, objectives: [
        'Identify appropriate and inappropriate use cases',
        'Apply data sensitivity, regulatory, and privacy considerations',
        'Follow organizational AI policies and governance standards',
        'Understand the ethical implications of AI usage',
      ]},
      { id: 7, name: 'Troubleshooting and Optimization', en: 'Troubleshooting and Optimization', weight: 10, objectives: [
        'Identify, diagnose, and resolve issues with underperforming prompts or poor outputs',
        'Adjust approach based on feedback and results',
        'Optimize workflows for efficiency and effectiveness',
      ]},
    ],
  },
  ccdv: {
    code: 'CCDV-F', short: 'Developer',
    name: 'Claude Certified Developer – Foundations',
    ja: 'Developer – Foundations',
    who: 'For engineers who build applications with the Claude API, tools and agents.',
    items: 53, minutes: 120, fee: '$125', pass: 720,
    guide: {
      en: 'https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946716/Claude_Certified_Developer_-_Foundations_Exam_Guide.pdf',
      nextEn: 'https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794946771/Claude_Certified_Developer_-_Foundations_Exam_Guide_Updated_Dec_7.pdf',
    },
    next: { from: '2026-12-07', items: '70 questions (60 scored + 10 unscored)',
      summary: 'The weights move a lot: integration 33→20%, Claude Code 3→8%, eval and debugging 3→10%, prompting 11→15%, agents 15→17%, models 17→12%. Objectives are regrouped into 8 domains and 24 skills. Newly spelled out: streaming end events (message_stop, and stop_reason on message_delta) and retries that tell error types apart (rate limit, overloaded, invalid request, timeout); ingesting files with the Files API; grounding and citations (answer "not found" when the source has nothing); full-context versus retrieval; choosing a sandboxed runtime such as Managed Agents; structured outputs with strict schemas; cache breakpoints (single, layered, rolling); workspace-scoped API keys; and when to use Skills, plugins, rules, hooks, subagents and slash commands.',
      domains: ['1 Agents and Workflows 17%', '2 Applications and Integration 20%', '3 Claude Code 8%', '4 Eval, Testing, and Debugging 10%', '5 Model Selection and Optimization 12%', '6 Prompt and Context Engineering 15%', '7 Security and Safety 8%', '8 Tools and MCPs 10%'] },
    domains: [
      { id: 1, name: 'Agents and Workflows', en: 'Agents and Workflows', weight: 14.7, objectives: [
        'Agent Architecture (4.5%): workflows versus agents, manager/supervisor hierarchies, subagent roles',
        'Agent Construction with Claude (5.3%): Claude Agent SDK, custom agent loops and harnesses, managed agents (self-hosted or Anthropic-hosted), hooks for deterministic behavior',
        'Agent Patterns and Frameworks (4.9%): tool-use loop, subagents, memory, context window management, abstraction frameworks (Strands, LangGraph, PydanticAI and others)',
      ]},
      { id: 2, name: 'Applications and Integration', en: 'Applications and Integration', weight: 33.1, objectives: [
        'Understanding Requirements (3.4%): functional and infrastructure requirements from business needs and solution architecture',
        'Systems Life Cycle (2.8%): concepts and frameworks for development, deployment, operation and maintenance',
        'Claude API Mechanics (6.8%): messages, tools, streaming, vision, thinking, caching, calling through third-party platforms, Batch API, real time versus batch',
        'Software Engineering Foundations (7.4%): REST APIs, JSON, async, version control, fitting into the SDLC, code review, refactoring',
        'Claude Application Design (8.6%): how instructions are read on each surface (Claude Code, Desktop, claude.ai, API, SDK), content boundaries, schema design, session hygiene, plugin management',
        'Configuration Management (4.1%): CLAUDE.md, settings.json, pinning model versions, versioning prompts, plugin dependencies',
      ]},
      { id: 3, name: 'Claude Code', en: 'Claude Code', weight: 3.1, objectives: [
        'Claude Code Operation (3.1%): rules, skills, commands, agents and agent memory; session management, slash commands, headless mode, streaming mode, auto mode, the CLAUDE.md hierarchy, initializing a repository, settings.json',
      ]},
      { id: 4, name: 'Eval, Testing, and Debugging', en: 'Eval, Testing, and Debugging', weight: 2.6, objectives: [
        'Debugging and Error Handling (2.6%): identifying error types, recovery strategies, trace analysis, separating the integration layer from model output',
      ]},
      { id: 5, name: 'Model Selection and Optimization', en: 'Model Selection and Optimization', weight: 16.8, objectives: [
        'LLM Fundamentals (5.2%): tokens, context windows, sampling, non-determinism, next-token generation; fast mode, extended thinking, adaptive thinking, effort levels; zero-, single- and multi-shot',
        'Technical Fundamentals (6.1%): integrating through SDKs that wrap the REST API, WebSockets and other basic technical concepts',
        'Model Selection and Tradeoffs (2.7%): use cases for Opus, Sonnet and Haiku, adaptive thinking support, quality/latency/cost tradeoffs, breaking changes between releases',
        'Cost and Token Management (2.8%): tracking token usage, cost modeling, prompt caching and cache checkpoints',
      ]},
      { id: 6, name: 'Prompt and Context Engineering', en: 'Prompt and Context Engineering', weight: 11.0, objectives: [
        'Context Engineering (3.8%): managing the context window, preventing drift and bloat (pruning tool output, compaction), isolating context with subagents',
        'Prompt Engineering (4.6%): clear instructions, few-shot, system versus user placement, output constraints, iterative refinement, sanitizing input',
        'Output Handling (2.6%): structured output patterns, validating responses, defensive parsing, not trusting confident output',
      ]},
      { id: 7, name: 'Security and Safety', en: 'Security and Safety', weight: 8.1, objectives: [
        'AI Application Security (3.2%): prompt injection, jailbreaks, untrusted input, data leakage, PII, authentication, authorization, confidentiality, integrity',
        'Guardrails and Safe Deployment (2.3%): content policy, layered guardrails, secure by design, least privilege',
        'Claude Hooks (1.0%): hooks as guardrails that prevent destructive actions',
        'Identity, Secrets, and Key Management (1.6%): managing secrets and API keys in development and production, authentication, checking access levels, monitoring',
      ]},
      { id: 8, name: 'Tools and MCPs', en: 'Tools and MCPs', weight: 10.6, objectives: [
        'Tool Implementation (4.4%): tool use and function calling, writing tool descriptions, error handling, client-side and server-side tools, approval patterns, building toolsets',
        'MCP Server Development (2.1%): building, deploying and integrating servers; resources, tools and prompts; communication patterns (stdio, sockets, client and server)',
        'Agentic Customization (4.1%): tradeoffs between built-in tools, custom tools, skills and MCP, and when to use each',
      ]},
    ],
  },
};
window.QUESTIONS = window.QUESTIONS || {};
