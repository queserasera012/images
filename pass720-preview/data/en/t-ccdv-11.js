window.TEXT = window.TEXT || {};
window.TEXT["ccdv-11"] = {
 "intro": "**Exams taken from December 7 follow official guide v1.1.** There are 70 questions; 60 are scored and 10 are unscored trial items. Time stays at 120 minutes and the pass mark at 720/1000. The 8 domains are the same, but **the weights move a lot and the objectives are rewritten as 24 skills**.\n\n**How the weights move** (v1.0 → v1.1)\n- Integration 33 → **20%** (less general software engineering; focused on how the API works and fails)\n- Claude Code 3 → **8%**, Eval, Testing, and Debugging 3 → **10%** (both up sharply)\n- Prompt and Context 11 → **15%**, Agents 15 → **17%**, Models 17 → **12%**\n\n**Newly spelled out**\n- **Terminal streaming events** (message_stop, and stop_reason in message_delta) and **retries by error class** (rate limit, overloaded, invalid request, timeout)\n- Ingestion through the **Files API**\n- **Grounding and citation** (answer only from supplied documents, say \"not found\" otherwise) and choosing between full context and retrieval\n- Choosing a **managed, sandboxed runtime** (such as Managed Agents) or your own harness\n- **Structured output with strict schemas**\n- **Cache breakpoints** (single, layered, rolling)\n- **Workspace-scoped API keys**\n- Choosing and distributing Claude Code **Skills, plugins, Rules files, hooks, subagents and slash commands**\n\nFor each v1.1 objective, this text first gives **what v1.1 spells out**, then the matching sections from v1.0. Real exam questions are under NDA; everything here is original explanation.",
 "domains": {
  "1": {
   "intro": "Weight 17%. v1.0 D1 plus choosing an architecture from the requirements.",
   "obj": [
    {
     "body": "### Spelled out in v1.1\n- Two choices: **workflow or agent** (requirements, error tolerance, audit needs), and **where it runs**\n- It runs either in **your own harness** (the Agent SDK or a custom loop in your environment) or in a **managed, sandboxed runtime** (such as Managed Agents, where Anthropic holds the execution environment and state)\n- Managed runtimes are lighter to operate and suit long-running work and resuming after a disconnect. In exchange, check **where execution and session data live** against the requirements",
     "docs": []
    }
   ]
  },
  "2": {
   "intro": "Weight 20% (33% in v1.0). Less general software engineering; focused on **how the Messages API is used and how it fails**.",
   "obj": [
    null,
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- **End of a stream**: treat a response as complete only when **message_stop** arrives. The stop_reason and final usage come in **message_delta**. If the connection drops midway, do not treat what you received as complete\n- **Handle errors by class**: rate limit (429) and overloaded (529) are **retried with growing intervals** (follow retry-after when given); invalid request (400) **fails the same way until you fix it**; timeouts may be retried, but watch for double execution of side effects\n- **Files API**: when you reuse a file, upload it once and refer to it by file_id. Pass each format (PDF, image, text) in the way that fits it",
     "docs": []
    }
   ]
  },
  "3": {
   "intro": "Weight 8% (3% in v1.0). Beyond operation, **choosing and distributing the right extension for team work** is its own objective.",
   "obj": [
    null,
    {
     "body": "### Spelled out in v1.1\nChoosing the mechanism:\n\n- **Hook**: anything that must always run (formatting, checks, blocking risky actions). It does not depend on the model\n- **Skill**: procedures or knowledge loaded when needed (loaded automatically from its description, or called with `/name`)\n- **Rules file**: conventions scoped by path (paths in `.claude/rules/`)\n- **Subagent**: work you want done in a separate context\n- **Slash command**: a routine action a person calls explicitly\n- **Plugin**: the unit that bundles these to **distribute to a team** (installed from a marketplace)\n\n- When distributing, do not depend on anything only the author has (absolute paths, personal settings, unregistered MCP servers)",
     "docs": []
    }
   ]
  },
  "4": {
   "intro": "Weight 10% (3% in v1.0). **Designing evaluations** is its own objective.",
   "obj": [
    {
     "body": "### Spelled out in v1.1\n- Build evals from the quality you want to measure: **golden sets** (examples with answers), **regression tests** (has anything you fixed come back), **behavioral checks** (format, refusal, safety)\n- **Calibrate an LLM judge against human scoring before using it.** Measure agreement with human labels, and fix the criteria or examples if they disagree\n- Choose metrics you can explain (not only an average: by segment and by failure type)",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Failure types: **hallucination, refusal, under-acting (not calling a needed tool), context loss, format drift, inconsistent output**\n- First separate **integration (code and how inputs are passed) from model output**. Use the trace to see what reached the model and what came back\n- Fix the cause, not the symptom (format drift → use structured output rather than loosening the parser)",
     "docs": []
    }
   ]
  },
  "5": {
   "intro": "Weight 12% (17% in v1.0).",
   "obj": [
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- First find **the largest cost driver** (a long preamble repeated every call, a conversation that keeps growing, bulk work that is not urgent)\n\n**Cache breakpoints**: put stable content first and place a breakpoint after it. Up to four. The cache works from the front, in the order tools, system, messages.\n\n- **Single**: one breakpoint after a long system prompt or document\n- **Layered**: a breakpoint per layer that changes at a different rate (tool definitions, instructions, documents)\n- **Rolling**: in a growing conversation, place it on the newest message each turn\n\n- Use **Batch** for bulk work that is not urgent and a **token budget** (max_tokens) for output length. Estimate the effect as how much the cost goes down",
     "docs": []
    }
   ]
  },
  "6": {
   "intro": "Weight 15% (11% in v1.0). **Grounding** is a new objective.",
   "obj": [
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- Structured output with a **strict schema** guarantees shape (types and required fields). It does not guarantee the values are right for the business, so keep validating content\n- **Defensive parsing** of free-text fallbacks (do not silently continue with empty values on failure: retry or raise an error)",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Three parts of grounding: **answer only from the supplied documents, cite the source, and return \"not found\" when absent**. Say so explicitly in the instructions\n- **Having the model quote the supporting text before answering** reduces unsupported answers\n- **Citations** in the Messages API return, with the response, where in the documents each claim comes from. Asking for sources afterwards can produce plausible but invented sources\n- **Full text or retrieval**: if it fits in context and rarely changes, supply the full text (reused with caching). If it is too large, changes often, or costs too much, retrieve only the relevant passages",
     "docs": []
    }
   ]
  },
  "7": {
   "intro": "Weight 8%.",
   "obj": [
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- Keep keys **on the server** and proxy requests. Never embed them in an app (browser or phone)\n- Scope keys with **workspace-scoped keys** and separate them per environment (development, staging, production). **Admin API keys** are for managing the organization, not for apps\n- **Rotation** and **usage monitoring** (sudden spikes, use from unknown places)",
     "docs": []
    }
   ]
  },
  "8": {
   "intro": "Weight 10%.",
   "obj": []
  }
 },
 "appendix": null
};
