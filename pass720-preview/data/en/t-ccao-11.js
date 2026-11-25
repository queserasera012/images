window.TEXT = window.TEXT || {};
window.TEXT["ccao-11"] = {
 "intro": "**Exams taken from December 7 follow official guide v1.1.** There are 70 questions; 60 are scored and 10 are unscored trial items (you are not told which). Time stays at 120 minutes and the pass mark stays at 720/1000.\n\n**The biggest change is 7 domains becoming 6.** Troubleshooting and Optimization is no longer its own domain. **Diagnosing causes moved into D1 (prompt diagnosis) and D5 (configuration degradation), and efficiency into D4 (repeatable workflows).** Weights are 15/20/15/18/15/17%. The center of gravity is still **D2 Output Evaluation (20%)**.\n\n**Newly spelled out**\n- **Effort level** is now something you choose, alongside the model\n- How to use and maintain **Skills, connectors and memory (including incognito chats)**\n- **Delegation criteria**: reversibility, stakes, need for human judgment or empathy, accountability\n- Sorting output into ready to use, needs revision, or needs human correction\n- Judging whether to **trust third-party Skills and connectors**\n- When a policy breach appears, telling a **policy gap from a training gap** before fixing it\n- **No memorizing published numbers** such as prices, context window sizes or rate limits. The exam tests judgment, not figures\n\nFor each v1.1 objective, this text first gives **what v1.1 spells out**, then the matching sections from v1.0. Real exam questions are under NDA; everything here is original explanation.",
 "domains": {
  "1": {
   "intro": "v1.0 D1 (prompting) joined by D7's diagnosis of off-target output. Weight 15%. When output misses, the core skill is naming **what was missing from the specification** (context, a clear instruction, a constraint, or an approach that fits the task).",
   "obj": [
    null,
    null,
    {
     "body": "### Spelled out in v1.1\n- When output differs from what you expected, treat the cause as a **specification gap** of one of four kinds: **missing context**, **ambiguous instruction**, **absent constraint**, or **the wrong strategy for the task type**\n- Then decide whether to **iterate (add to the same chat), restart (rebuild in a new chat) or change approach (decompose, or use a different capability)**\n- When a long chat starts drifting, **summarizing and starting fresh** is often faster than adding more",
     "docs": []
    }
   ]
  },
  "2": {
   "intro": "At 20%, the largest domain. v1.1 separates evaluating output from deciding **how deeply to review** and **when to escalate**.",
   "obj": [
    {
     "body": "### Spelled out in v1.1\n- Sort output into **ready to use**, **needs revision**, or **needs human correction**\n- Judge by **accuracy, completeness, relevance and fitness for purpose**, against the source, the requirements or professional standards\n- Factual errors in anything going outside belong to human correction. Do not stop at having Claude fix them",
     "docs": []
    },
    null,
    {
     "body": "### Spelled out in v1.1\n- Set review depth by **the consequence of an error** and **the intended use**. **Internal drafts** and **external deliverables** have different standards\n- Separate what must be independently verified (figures, quotations, regulations, anything about individuals), what can be fixed, and what goes to a person to decide\n- Neither \"AI made it, so doubt everything\" nor \"AI made it, so it matters less\": **let the weight of the content decide**",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Format choices now include **code-executed results** (have exact calculations computed rather than written out) and **Skill-produced documents** (fixed-format material)\n- Choosing inline, artifacts or structured data by audience and channel is the same as in v1.0",
     "docs": []
    }
   ]
  },
  "3": {
   "intro": "v1.0 Product and Model Selection becomes **Capability, Model, and Context Selection**. Weight 15%.",
   "obj": [
    {
     "body": "### Spelled out in v1.1\n- The capabilities explicitly include **Skills, connectors, code execution and memory**\n- Decide by what each is for: **Projects** for recurring context, **research** for cited investigation, **Artifacts** for deliverables you build up, **code execution** for exact calculation and analysis, **Skills** for fixed procedures or formats, **connectors** for current company information, **memory** for preferences and context across chats",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Choose the **effort level** (how deeply Claude thinks) together with the model. Higher effort tends to raise quality but is slower and costs more\n- For simple, high-volume work, **the fast, low-cost option is often right**. Raise it only when quality falls short\n- The exam asks whether you can **justify the choice against the alternatives**. \"Pick the top model to be safe\" is not the answer",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- **Maintaining memory**: you can view, edit and delete memories. Old assumptions or wrong preferences left in memory skew other work too\n- **Incognito chats**: for one-off work you do not want kept in history or memory\n- Choosing between restarting, summarizing, keeping it in a Project and relying on memory is the same as in v1.0",
     "docs": []
    }
   ]
  },
  "4": {
   "intro": "Weight 18%. v1.0 D4 joined by D7's workflow efficiency. **Delegation judgment** and **making work repeatable** are the new pillars.",
   "obj": [
    null,
    {
     "body": "### Spelled out in v1.1\n- Four criteria for delegation: **reversibility** (can it be undone), **stakes** (cost of an error), **need for human judgment or empathy**, and **accountability** (who answers for it)\n- Assign each step as **AI-executed, human-retained, or AI-made and human-reviewed**\n- Spot **over-delegation**: designs that hand irreversible or weighty decisions to AI are wrong",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Work where you type the same instructions by hand every time should become **a Project, Skill, connector or code-executed step** so it gives the same result whoever runs it\n- **Handoff** is tested too: once handed to a colleague, can they run it as its owner (instructions, materials and steps all in the Project)?",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Tell people new to AI **what Claude can do, what it cannot do reliably, what human checks remain, and realistic outcomes**\n- **Overselling and underselling are both wrong.** Neither \"it can automate everything\" nor \"AI cannot be trusted, so do not use it\" is the answer",
     "docs": []
    }
   ]
  },
  "5": {
   "intro": "Weight 15%. In v1.1, **configuration degradation (which layer caused a drop in quality)** is its own objective.",
   "obj": [
    {
     "body": "### Spelled out in v1.1\n- Project elements now include **Skills** and **scoped memory**\n- For each requirement choose **instructions, knowledge or a Skill**. Keep unrelated work in separate Projects",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- **Upload or connector**: upload material that does not change; connect information that updates daily\n- Keep connected knowledge **current and relevant**. Old or unrelated material is noise and pulls answers back to generalities",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- **Standing instructions versus the request**: behavior you want every time goes in standing instructions; one-off needs go in the request\n- Anticipating the likely uses and constraints in the instructions keeps output consistent",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- When quality shifts, check which layer changed: **instructions**, **stale knowledge**, **Skill versions**, **accumulated memory**\n- Layers you did not touch can still change (Skill updates, replaced files, accumulated memory). **Do not assume the model got worse without evidence**",
     "docs": []
    }
   ]
  },
  "6": {
   "intro": "Weight 17%. v1.0 Governance, Risk, and Responsible Use gains **data protection in practice** and **trust in third parties**.",
   "obj": [
    {
     "body": "### Spelled out in v1.1\n- Classify use cases as **appropriate, appropriate with safeguards, or inappropriate**, and record why\n- **Third-party Skills and connectors**: check the author and contents and put them through your organization’s approval before use. Do not let the model judge their safety\n- The basis is the **Anthropic Usage Policy** and your organization’s policy",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- Order: **classify → redact or anonymize → decide whether it may be shared**\n- **Uploading for code execution is still sharing.** If a table holds personal data, remove the columns or replace them with IDs first\n- Use **memory and incognito chats** as policy says. Asking Claude \"do not remember this\" is not a control",
     "docs": []
    },
    {
     "body": "### Spelled out in v1.1\n- When usage departs from policy, first decide whether it is a **policy gap** (not written, or unclear) or a **training gap** (written but not known or not followed)\n- Fix a policy gap by fixing the policy; fix a training gap with training and checks. **Adding wording to a policy does not fix a policy that is ignored**\n- Look at ethical risks (bias, lack of transparency) and **Diligence lapses** (skipping checks) the same way",
     "docs": []
    }
   ]
  }
 },
 "appendix": null
};
