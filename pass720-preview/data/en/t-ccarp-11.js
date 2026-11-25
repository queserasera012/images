window.TEXT = window.TEXT || {};
window.TEXT["ccarp-11"] = {
 "intro": "**Exams taken from December 7 follow official guide v1.1.** There are 70 questions; 60 are scored and 10 are unscored trial items. Time stays at 120 minutes and the pass mark at 720/1000. The 7 domains are the same, but **the objectives are rewritten as 39 skills**.\n\n**Weights** are 18/13/21/17/16/7/8%. The biggest drop is **D6 Stakeholders (14 → 7%)**; D1, D3, D4, D5 and D7 go up.\n\n**Newly spelled out**\n- **Dividing work between Claude and people** (reversibility, stakes, accountability)\n- Choosing a **deployment platform** (Anthropic API, Amazon Bedrock, Google Vertex AI, Microsoft Foundry) and an **agent runtime** (a Messages API loop, the Agent SDK or headless Claude Code, Managed Agents)\n- **Reasoning effort** and the **context lifecycle** (context editing, the memory tool, compaction)\n- Production reliability: **idempotency** and **fallback paths**\n- **LLM-as-judge bias** (position, verbosity, self-preference, scoring drift) and **comparisons with a set number of trials**\n- **Model version migration** (pin, retune prompts, rebaseline the eval, defer)\n- **Injection entry points** (retrieved documents, tool results, MCP responses, third-party Skills)\n- **ZDR and tenant isolation**, **ADRs (architecture decision records)**, **plugins, managed settings and permission modes**, **accountability for AI-written code**\n\nThe guide says many questions will ask you to **read something someone built (a diagram, config, log, eval result or code) and make a judgment**.\n\nFor each v1.1 objective, this text first gives **what v1.1 spells out**, then the matching sections from v1.0. Real exam questions are under NDA; everything here is original explanation.",
 "domains": {
  "1": {
   "intro": "Weight 18%. **Dividing the work** and **where it runs** are the new objectives.",
   "obj": [
    {
     "body": "### Spelled out in v1.1\n- Split each part of the work into **Claude does it, a person keeps it, or both (Claude makes it, a person checks it)**, and give the reason in terms of **reversibility, stakes and accountability**\n- Hand over what is easy to undo and low-cost (sorting, drafts, small transactions) and check it afterwards from the record. A person keeps what cannot be undone or weighs heavily on customers or the law\n- Both extremes, \"all AI\" and \"all people\", are wrong. The exam asks how you design the \"both\" in between",
     "docs": []
    },
    null,
    null,
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- **Deployment platforms**: Anthropic API, Amazon Bedrock, Google Vertex AI, Microsoft Foundry. Decide by **data residency, compliance, available models and who runs operations**\n- New features may **arrive at different times or in different forms** depending on the platform. If you follow the customer's cloud, first check that the feature you need is available there\n- **Agent runtimes**:\n- **Messages API loop**: the most freedom, but you own the loop, the state and tool execution\n- **Agent SDK / headless Claude Code**: the agent parts come ready-made and run in your own environment\n- **Managed Agents**: Anthropic holds the execution environment and session state. Strong for long-running work and resuming, light to operate, but check where data is kept against the requirements\n- Be able to explain what the choice does to **latency, available features, hosting, how state is held, sandboxing and who controls the data**",
     "docs": []
    }
   ]
  },
  "2": {
   "intro": "Weight 13%.",
   "obj": [
    null,
    null,
    null,
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- Allocate **reasoning effort** by how hard each step is. Keep it light for simple, high-volume steps and heavy for the hard steps that decide quality\n- The **context lifecycle** of a long-running agent:\n- **Context editing**: remove parts no longer needed, such as old tool results, so the same session lasts longer\n- **Compaction**: summarize the conversation and pack it again. The flow survives, but details are lost\n- **Memory tool**: write to files and read them back across sessions. Use it for decisions and facts that must last across days\n- Choose by **session length, latency and accuracy requirements**",
     "docs": []
    }
   ]
  },
  "3": {
   "intro": "Weight 21% (the largest).",
   "obj": [
    null,
    null,
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- Three shapes of retrieval: **pre-built RAG** (build an index and fetch nearby chunks), **agentic search with tools** (search with grep or an API as needed), and **putting the full text in context**\n- If you build an index, also decide on **contextual retrieval** (prefix each chunk with what part of which document it is about before indexing) and a **fallback when nothing is found** (add keyword search, or switch to the full text)",
     "docs": []
    },
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- Read the production failure type from logs and load, and pick the control that fits:\n- **Rate limits and overload**: retry with growing intervals (with jitter). Do not hammer immediately\n- **Tools with side effects** (payments, orders, sends): attach an **idempotency key** so the same request runs only once. Check the state before retrying\n- **Persistent failure**: a **fallback path** to another model or route\n- Only extending the timeout **does not remove the risk of double execution**",
     "docs": []
    }
   ]
  },
  "4": {
   "intro": "Weight 17%.",
   "obj": [
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- When LLM-as-judge results disagree with human judgment, identify which bias it is and fix it:\n- **Position**: tends to pick whichever comes first → compare twice with the order swapped and count only the agreements\n- **Verbosity**: tends to score longer answers higher → keep length out of the criteria, calibrate with examples of equal length\n- **Self-preference**: favors answers from models of the same family → check against a different judge or human scoring\n- **Scoring drift**: the standard shifts over time → recalibrate regularly on a fixed set of human-scored items\n- Adding \"do not be influenced\" to the instructions does not remove it",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Model output varies even for the same input. When comparing two setups, run **each case several times** and check whether the gap between setups is larger than the run-to-run variation\n- Winning by a few points on one run each is not a gap you can trust. Set **number of cases × number of trials** within the budget",
     "docs": []
    },
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- From the **retirement schedule** of the version you use and the **regression eval results** of the candidate version, choose among four responses:\n- **Pin**: pin to a dated version to buy time for migration\n- **Retune prompts**: fix only where it regressed, to suit the new version\n- **Rebaseline the eval**: if the eval leans on how the old version wrote and the business is unaffected, rebuild the reference answers and scoring on business criteria\n- **Defer**: when the deadline is far and the regression is serious. But you cannot defer past the deadline\n- Do not switch on the average score alone. Look at regressions by segment",
     "docs": []
    }
   ]
  },
  "5": {
   "intro": "Weight 16%.",
   "obj": [
    null,
    {
     "body": "### Spelled out in v1.1\n- Injection entry points: **retrieved documents, tool results, MCP server responses and third-party Skills**. All of them are \"outside content\" that enters the model's context\n- Layer the controls: **mark it off as data**, **keep connected tools and permissions minimal**, **put risky actions such as sending or deleting through human confirmation**, and check the output\n- **Only writing \"do not follow it\" in the prompt gets broken.** On its own it is weak\n- Check a third-party Skill's contents, **pin its version** and put it through approval before installing (so it cannot change by itself)",
     "docs": []
    },
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- Tie each compliance obligation to **configuration that serves as evidence**: **data residency and deployment platform**, **retention and ZDR (zero data retention)**, **PII detection and redaction**, **audit logs**, **tenant isolation** (customers' data never mixes)\n- \"We chose a compliant platform, so we are done\" is not enough. For each obligation, be able to say which control shows it",
     "docs": []
    }
   ]
  },
  "6": {
   "intro": "Weight 7% (14% in v1.0). Narrowed to three objectives.",
   "obj": [
    null,
    {
     "body": "### Spelled out in v1.1\n- An **ADR (architecture decision record)** states the decision, the options not chosen, the trade-offs and **the remaining risk**\n- Find and fix where it does not meet stakeholder constraints (cost, data residency, latency)\n- **Do not make absolute claims about model behavior** (do not write \"the model always follows this policy\"). Write it assuming checks and monitoring back it up",
     "docs": []
    }
   ]
  },
  "7": {
   "intro": "Weight 8%.",
   "obj": [
    {
     "body": "### Spelled out in v1.1\n- When spreading Claude Code work that succeeded in one team to the whole organization, bundle it as a **plugin** (skills, hooks, subagents, commands, MCP configuration)\n- Distribute it through a **marketplace**. Safety rules that must apply to everyone (no reading secret files, blocking risky actions) are **enforced centrally with managed settings**; team conventions are left to each team\n- Decide what to lock centrally so it stays safe even when running unattended",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- **Permission modes**:\n- **default**: asks each time a tool is used\n- **acceptEdits**: accepts file edits automatically\n- **plan**: read and plan only. Does not carry out edits (for investigation-only work)\n- **auto**: lets a classifier decide and proceeds\n- **dontAsk**: refuses anything not allowed in advance, without waiting for confirmation (for unattended CI)\n- **bypassPermissions**: skips all confirmation. Use only in an isolated environment\n- Configure hooks, subagent definitions and headless or CI runs within the team's rules for safety and automation",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Even for AI-written code, **a person owns it**. In review, require \"can you explain why this change was made\"\n- Keep test, review and approval controls in step with the speed of generation (AI-written changes do not reach production without passing through human understanding)",
     "docs": []
    }
   ]
  }
 },
 "appendix": null
};
