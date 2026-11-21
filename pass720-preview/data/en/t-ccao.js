window.TEXT = window.TEXT || {};
window.TEXT.ccao = {
 "intro": "**Associate – Foundations asks whether you can use Claude properly at work.** There is no API and no code. What it tests is how you put a prompt together, the habit of not taking output at face value, choosing among products (Projects, Research, Artifacts, memory, connectors) and models (Haiku, Sonnet, Opus), and judgment about confidential information and governance.\n\n**The weight sits on Domain 2, Output Evaluation and Validation (21%).** Together with Domain 4 (16%) and Domain 6 (15%) it is more than half the exam.\n\n**The way to tell options apart is almost always the same.**\n- “Claude said it confidently, so use it as it is” is always wrong\n- “A person checks,” “go to the source,” “confirm permission before entering confidential data” are on the right side\n- The two extremes, “leave everything to Claude” and “people do everything,” are wrong. The division of work in between is right\n- Product questions are settled by what the feature is for (Projects = recurring context, Research = cited investigation, Artifacts = deliverables you develop)\n\n**Each objective has a “Points to remember” box with the deciding factors in brief.** The foundation is the four competencies of AI Fluency (**Description, Discernment, Diligence, Delegation**). **The exam guide changes for appointments from December 7, 2026**: 70 questions (60 scored) and **six domains**. Troubleshooting stops being its own domain and is spread across Domains 1, 4 and 5; output evaluation becomes 20%, workflow 18%, governance 17%.\n\nThese notes summarize the key points for each objective in the current exam guide (July 2026 blueprint). Real exam items are not public; everything here is original explanation.",
 "domains": {
  "1": {
   "intro": "The domain about how to write prompts. Weight 14%. The right answers turn on three things: **be specific, break it up, and improve as you go**. Options that look for “the perfect prompt in one try” are usually wrong; “look at the output and fix it” is right.",
   "obj": [
    {
     "body": "A good prompt has five parts. **Role** (who is answering), **context** (what for, for whom, what is assumed), **task** (what to do, as a verb), **constraints** (length, format, tone, what not to do) and **examples** (a sample of the output you want). You do not always need all of them; add the part whose absence makes the output wander.\n\n- A specific instruction (“three points for the executive meeting, one sentence each, with numbers”) beats a vague one (“summarize it nicely”)\n- “Do this” beats “don't do that.” A negative alone does not say what to do instead\n- Put long material at the top of the prompt and the instruction at the end. Separating material and instruction with XML tags or similar reduces mix-ups\n- For business and technical tasks alike, **writing the success condition (what counts as done)** helps most\n\n### 🎓 Points to remember\n- **The five elements of a prompt**: Role, Context, Task, Constraints, Output format. Not every one is needed every time; **the more important the deliverable, the more of them you state**\n- **The biggest cause of generic output is missing context.** Unless it is connected, Claude does not know what is in your head or inside your company\n- The foundation is the four competencies of AI Fluency: **Description, Discernment, Diligence, Delegation**. When stuck between options, first ask which of the four the question is testing\n\n> For a “low-quality output” question, first suspect that the instruction lacks audience, purpose and format. The right option is the one that adds context and a success condition most concretely.",
     "docs": [
      [
       "Prompt engineering overview",
       "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      ],
      [
       "Be clear and direct",
       "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct"
      ]
     ]
    },
    {
     "body": "Do not pack a complex request (“research three competitors, build a comparison table, turn it into a proposal”) into one prompt; **split it into stages**. If you check each stage's output before passing it on, an early mistake is not dragged to the end.\n\n- **Split by sequence**: research → organize → write → polish. The previous output becomes the next input (prompt chaining)\n- **Split by viewpoint**: have the same material read separately “as legal” and “as the customer,” then merge at the end\n- **Let Claude split it**: ask “break this request into steps and list the information each step needs,” fix that plan, then run it\n- At each stage, create a place where a person looks at what needs confirming so far\n\n### 🎓 Points to remember\n- **Split multi-stage work in sequence and produce an intermediate result you can check at each stage.** When several deliverables share a base, **settle the base (extraction and confirmation) first**\n- **Steps that build on each other stay in the same conversation; independent steps, or a conversation that has grown too long, go to a separate one**\n\n> Between “do everything in one prompt” and “split into stages and check along the way,” choose the latter. But “people do everything by hand” is wrong (there would be no point in using Claude).",
     "docs": [
      [
       "Chain prompts",
       "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts"
      ]
     ]
    },
    {
     "body": "A prompt is something you **fix after seeing the output**. The exam is not about guessing the right prompt first time. There is a pattern to fixing.\n\n- **Identify what is missing**: too long → add a length constraint. Off-target → add audience and purpose. Format varies → add an example. Shallow → specify depth (“with reasons,” “with counterexamples”)\n- **Change one thing at a time.** Change several and you cannot tell which worked\n- **Compare on the same input.** If the input changes too, it is not a comparison\n- Keep instructions that worked in Project instructions or a style, and use them from next time\n- Asking Claude itself “what is ambiguous in this prompt?” also works\n\n### 🎓 Points to remember\n- **Diagnostic iteration**: tie the complaint about the output to whichever of the five elements is missing, and **fix only that point**. A full rewrite loses what was working and hides what helped\n- **When the gains get small, stop and finish by hand**\n\n> “The output is not what I expected” → the answer is “state the gap concretely and regenerate.” “Switch to another model” and “give up and write it by hand” are wrong because they do not look at the cause.",
     "docs": [
      [
       "Prompt engineering overview",
       "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      ]
     ]
    },
    {
     "body": "How you build the prompt changes with the type of task.\n\n- **Analysis**: Give the decision criteria and the data, and have it write “conclusion → evidence → assumptions.” Include “say you don't know when you don't know”\n- **Research**: Ask for sources. Use something that can search, such as Research, and doubt any firm statement without a source\n- **Drafting**: Specify audience, tone, length and structure, and give a sample if you have one. Get the outline first, confirm it, then the body\n- **Brainstorming**: Ask for volume (“20 ideas”). Evaluate separately, afterward (evaluating while generating narrows the range). Add constraints (budget, timeline) later to narrow down\n- **Summarizing**: Set length and angle by who reads it and why (“three lines for executives,” “steps for frontline staff”)\n\n### 🎓 Points to remember\n- By task type, change **what you tighten and what you loosen**: for analysis, strict criteria and scope; for research, a clear question and sources; for drafting, reader, tone and format; **for brainstorming, only the goal and a minimal frame, asking for volume and range**\n\n> In a brainstorming question, “get the numbers first, evaluate later” is right. In an analysis question, “have it show evidence and assumptions” is right.",
     "docs": [
      [
       "Use XML tags",
       "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags"
      ]
     ]
    }
   ]
  },
  "2": {
   "intro": "**The most heavily weighted domain on this exam (21%).** There is one axis: **Claude's output is a draft, and a person checks it before it is used.** Checking everything from scratch is also inefficient, so the exam asks you to judge what to check and how far.",
   "obj": [
    {
     "body": "Accuracy (is what is written correct?) and completeness (is everything needed there?) are separate axes. Do not relax after looking at only one.\n\n- **Accuracy**: Always check proper nouns, figures, dates, quotations and article numbers against the original. The more plausible the sentence, the more care it needs\n- **Completeness**: Make a list of the source's key points first and compare the output with it. Asking Claude “which items are missing?” is also an option\n- Whether the constraints you gave (length, format, audience) are met is part of the evaluation\n- An answer to a question where you supplied no material is written from Claude's training knowledge alone. The more recent the information, the more likely it is outdated or wrong\n\n### 🎓 Points to remember\n- **Three standards for evaluation**: the requirements you set, the source material you supplied, and the professional standards of the field. Hold the output against these three, not against how polished it looks\n- **Accuracy and completeness are different things.** What is written can be correct while an important element is missing. Omissions do not catch the eye, so check for them separately\n- **Three-way triage**: usable as it is / needs correction / needs correction or a decision by a person\n\n> “The most appropriate way to check a summary” → “compare it with the key points of the source.” Reading for whether it sounds natural, or asking Claude again, is not checking.",
     "docs": [
      [
       "Reduce hallucinations",
       "https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations"
      ]
     ]
    },
    {
     "body": "**Hallucination** is generating something untrue in a plausible way. It shows up in sources, figures, names, URLs and article numbers. **Inconsistency** is when statements in the same response disagree with each other or with the material you supplied. **Bias** is assumptions or wording skewed toward a particular position or attribute.\n\n- How to find them: ask “what is the source?” and “where in the material does it say that?” Have it quote the passage. If it cannot, be suspicious\n- A confident tone is not evidence of being right\n- Bias appears in the choice of examples, the assignment of roles and the order of comparison. Asking “how would this read from the opposite position?” makes it easier to see\n- Supplying the material and instructing “if it is not in the material, say it is not in the material” reduces hallucination\n\n### 🎓 Points to remember\n- **Typical hallucinations**: plausible but unsupported claims / fabricated overly specific figures, quotations and sources / an assertive tone unrelated to actual confidence / contradictions inside long text / skew toward a leading question / **claiming an action it did not perform, such as “I have sent it”**\n\n> “It cites a plausible article number” → the answer is “confirm in the original regulation before sharing.”",
     "docs": [
      [
       "Reduce hallucinations",
       "https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations"
      ]
     ]
    },
    {
     "body": "Choose the means of verification by what is being verified.\n\n- **Go to the primary source**: Laws, contracts, official announcements, the master copy inside the company. Claude's summary is a way in, not the evidence\n- **Supply the material and have it quote**: “Quote the passage word for word, then summarize.” A claim without a quotation is something to check\n- **Regenerate from another angle and compare**: Ask the same question in different words; where the answers disagree, check there\n- **Have calculations calculated**: Not mental arithmetic. Have the steps written out, and verify with code execution or a spreadsheet\n- **Get sources with a search-enabled feature (Research)**. Read what the sources actually say (having a source is not proof)\n\n### 🎓 Points to remember\n- **Grounding techniques**: say explicitly that “I don't know” is acceptable / restrict to the supplied material / ask for quotations that can be checked / **have the relevant passages extracted first and analyzed second** / run more than once to find where answers disagree / confirm important claims with authoritative outside sources\n- **Having Claude confirm that it is right is not independent verification**\n- **When figures must be exact, use code execution.** A figure generated as prose is an estimate; the result of code execution can be traced as a calculation (though the code itself can be wrong)\n- Tidying the input (removing duplicates, labeling, dropping unrelated material) directly raises output quality\n\n> “I want to cut the effort of checking” → the answer is “narrow to the spots that need checking (figures, proper nouns, conclusions).” Asking Claude “is this right?” is not verification.",
     "docs": [
      [
       "Citations",
       "https://docs.anthropic.com/en/docs/build-with-claude/citations"
      ]
     ]
    },
    {
     "body": "Know the conditions under which human review is **mandatory**.\n\n- It goes outside the company, reaches a customer, has legal effect, moves money, concerns hiring or evaluation, or concerns health or safety\n- The impact of an error is large and hard to undo afterward\n- Claude said “it is not in the material” or “I am not certain”\n- Conversely, an internal draft, idea generation or a summary only you will read needs only a light check\n\n**The axis of judgment is “harm if wrong × how easily it can be undone.”** The greater the harm, the thicker the verification, with review by a specialist (legal, accounting, a physician).\n\n### 🎓 Points to remember\n- **Four thresholds that decide whether human review is mandatory**: Stakes (size of impact) / Reversibility (can it be undone) / Audience (who will read it) / Regulatory exposure\n- For customer-facing final deliverables, calculations that bear on audit or finance, confidential or regulated data, and public or legal documents, **decide in advance that nothing goes out without human review**\n- **When iteration stops improving things, hand over to a human expert rather than adding more prompts**\n\n> “Automatically send replies to customers” is on the wrong side. “Make a draft; the person in charge checks and sends” is on the right side.",
     "docs": [
      [
       "Usage policy",
       "https://www.anthropic.com/legal/aup"
      ]
     ]
    },
    {
     "body": "Revise output according to **who will read it**. The same content takes a different shape for executives (conclusion and numbers, short), frontline staff (steps, concrete examples) and people outside (background explained, courteous wording).\n\n- Tell Claude the audience and have it adjust: “The reader is X. Make it understandable in 30 seconds”\n- Have two drafts produced and compare them (A/B). Decide the comparison criteria (clarity, accuracy, length) first\n- Edit in your own words. Sent out in Claude's style unchanged, it does not sound like your organization\n- Use only the technical terms the audience knows. For unknown terms, rephrase or add an explanation\n\n### 🎓 Points to remember\n- Even for the same content, the **reader (Audience)** is one of the four thresholds. Who reads it changes how deep the revision goes and whether human review is needed\n\n> “Revise for the executive meeting” → “conclusion first, in numbers, short.” “Write everything in careful detail” does not fit the reader.",
     "docs": [
      [
       "Styles in Claude",
       "https://support.claude.com/en/articles/10181068"
      ]
     ]
    },
    {
     "body": "Choose the **form** of the output.\n\n- **Inline** (text in the chat): An answer to a question, a short explanation, anything one-off\n- **Artifacts**: Documents, code, diagrams, presentations: **deliverables developed on their own**. Things you revise across versions, share or download\n- **Structured data** (table, JSON, CSV): For comparing, tallying or passing to another tool. When the fields are fixed and rows line up, use a table\n- **Curating** information: Not everything, only what the purpose needs. Asking “list what you left out” prevents cutting too much\n\n### 🎓 Points to remember\n- Choosing the entry point: one-off work in **chat**; recurring work with stable context in a **Project**; **a deliverable the recipient opens and reads as an Artifact**; deep investigation across many sources in **Research** (a light check of recent information is web search in chat)\n\n> “A document revised many times and finally distributed” → Artifact. “A list to load into another system” → structured data (CSV, table). “A question in the moment” → inline.",
     "docs": [
      [
       "Artifacts",
       "https://support.claude.com/en/articles/9487310"
      ]
     ]
    }
   ]
  },
  "3": {
   "intro": "Choosing among Claude's **product features** and **models**. Weight 12%. Two pillars: what each feature is for, and choosing Haiku, Sonnet or Opus by cost, speed and quality.",
   "obj": [
    {
     "body": "Know the purpose of each feature.\n\n- **Chat**: A question in the moment, a one-off task. Context exists only inside that conversation\n- **Projects**: **Work repeated in the same context.** With instructions (custom instructions) and knowledge (files) in place, you do not paste them every time. Can be shared with a team\n- **Research**: **Investigates across the web and connected data and reports with citations.** Takes time, but suited to research\n- **Artifacts**: Creates documents, code and diagrams **as standalone deliverables and revises them across versions**\n- **Memory**: Claude remembers across conversations. No need to restate preferences and background\n- **Skills**: Holds a fixed procedure (such as building a document in the house format) in reusable form\n- **Code execution and file creation**: Calculation, data processing, and generating files (spreadsheets, slides and so on)\n\n### 🎓 Points to remember\n- **Division of roles among the feature layers**: **Projects hold context / Skills define procedures / code execution verifies calculations / memory keeps continuity.** They are independent; use only the combination you need\n- **Is a Project worth creating?** Does the work recur? Is the background the same each time? Is the output format consistent? **Create one when at least two of the three apply**\n\n> “The same report format from the same files every week” → Projects. “Latest industry trends with citations” → Research. “A proposal revised many times” → Artifacts.",
     "docs": [
      [
       "Projects",
       "https://support.claude.com/en/articles/9517075"
      ],
      [
       "Research",
       "https://support.claude.com/en/articles/11088861"
      ]
     ]
    },
    {
     "body": "The three models (Haiku, Sonnet, Opus) are **steps in speed, cost and intelligence within the same generation**.\n\n- **Haiku**: Fastest and cheapest. Suited to classification, extraction, short replies and high volume\n- **Sonnet**: A balance of speed and intelligence. **The default choice** for everyday work, coding and analysis\n- **Opus**: The most intelligent. For complex reasoning, integrating long context, hard judgments and when quality comes first\n- Each new generation makes the whole family smarter. The same name has different ability in different generations\n\n### 🎓 Points to remember\n- High-volume work with a clear structure goes to **Haiku**, most work to **Sonnet**, and difficult, high-stakes work to **Opus**. **Always choosing the top model is a mistake**\n\n> “Sort a large volume of inquiries into categories” → Haiku. “Lay out the issues in a complex contract” → Opus. “Everyday work with nothing specified” → Sonnet.",
     "docs": [
      [
       "Models overview",
       "https://docs.anthropic.com/en/docs/about-claude/models/overview"
      ]
     ]
    },
    {
     "body": "Choose the model by **working back from the task's requirements**.\n\n- **Cost dominates** (high volume, simple, repetitive) → a small model. Try Haiku first and move up if quality falls short\n- **Speed dominates** (conversation, real time) → Haiku or Sonnet\n- **Quality dominates** (a wrong call is costly; one-off and important) → Opus\n- **Split**: Change models by step. Pre-reading and classification on Haiku, the final judgment on Opus\n- “The strongest, just in case” wastes cost and time. “The cheapest, just in case” brings rework on quality\n\n### 🎓 Points to remember\n- Choose models by quality, speed and cost. In the guide effective December 7, 2026, **the thinking-depth setting (effort level) is also something you choose**\n- The exam guide says memorizing numbers such as prices, context lengths and rate limits is not tested. Patterns of judgment matter more than numbers\n\n> If the question says “cost is the main concern” or “by tomorrow morning is fine,” think small model and batch-style processing. If it says “no mistakes allowed” or “complex,” think Opus.",
     "docs": [
      [
       "Choosing a model",
       "https://docs.anthropic.com/en/docs/about-claude/models/choosing-a-model"
      ]
     ]
    },
    {
     "body": "The **context window** is how much Claude can look at once in one conversation (in tokens). As a conversation grows, old parts fall away, responses get sluggish and earlier instructions are forgotten.\n\n- **Restart (a new conversation)**: When the topic changes, or the conversation has become long and heavy. Carry over only the background you need\n- **Summarize**: Have Claude summarize the key points of a long conversation and paste that at the top of a new one\n- **Persist (Projects, memory)**: Background, files and preferences needed every time go in Project instructions and knowledge or in memory, not in the conversation\n- Give only the needed part of a large document. Handing over everything dilutes the instruction that matters\n\n### 🎓 Points to remember\n- **Context is a budget.** In a long conversation early instructions stop working. There are three remedies: **Restart / Summarize and carry over to a new conversation / Persist in a Project or memory**\n- **In a degraded conversation, repeating the same instruction or moving up a model does not solve it**\n- Review memory regularly and edit or delete outdated items. **Keep clients separate with Project-level memory.** Incognito is for keeping a chat out of history and memory\n\n> “Earlier instructions stopped working in a long conversation” → the answer is “summarize the key points and start a new conversation” or “put the instructions in a Project.” “Paste the same instruction again and again” treats the symptom.",
     "docs": [
      [
       "Context windows",
       "https://docs.anthropic.com/en/docs/build-with-claude/context-windows"
      ],
      [
       "Memory",
       "https://support.claude.com/en/articles/11817273"
      ]
     ]
    }
   ]
  },
  "4": {
   "intro": "The domain about **building Claude into the flow of work** (16%): sorting out requirements, research, design, improving existing workflows and explaining to stakeholders. The right answers keep human judgment in place while handing repetition and first-pass reading to Claude.",
   "obj": [
    {
     "body": "In requirements analysis, give Claude scattered information (minutes, request emails, tickets) and have it **organize, classify, point out contradictions and point out gaps**.\n\n- Have requirements sorted into “must / nice to have / out of scope,” quoting the original statement as evidence\n- Put each stakeholder's interests in a table\n- Ask “which of these requirements contradict each other?” and “which assumptions are still undecided?”\n- Have use cases aligned to the form “who, when, for what purpose, does what”\n- The final priorities are decided by people. Claude's role is to assemble the material\n\n### 🎓 Points to remember\n- Requirements analysis: from messy input, **extract requirements into a table, attach source passages and open questions, and have Claude itself surface the ambiguous requirements**\n\n> “I want to find gaps in the requirements” → “have Claude organize them and list contradictions and open points; people decide.” “Have Claude decide the requirements” is wrong.",
     "docs": [
      [
       "Use case guides",
       "https://docs.anthropic.com/en/docs/about-claude/use-case-guides/overview"
      ]
     ]
    },
    {
     "body": "- **Research**: Produce a cited report with Research. Make the question specific (“the 2025 size of market X and its three main players”). Read the sources\n- **Planning**: Give goals, constraints and deadlines, get a draft plan, and have risks and assumptions listed. Ask for several options and compare\n- **Process optimization**: Write out the current steps, hand them over, and have it analyze “where are the waits, rework and duplication?” Have improvement ideas ranked by impact and effort\n- In every case the order is “Claude researched or reasoned” → “a person checks and decides”\n\n### 🎓 Points to remember\n- **Build plans on verified numbers**: calculation by code execution / synthesis and proposals by Claude / **the decision to adopt by a person**\n\n> “The first thing to do in process improvement” → “hand over the current steps and numbers and have the problems organized.” Jumping to “give me improvement ideas” produces ideas with no basis.",
     "docs": [
      [
       "Research",
       "https://support.claude.com/en/articles/11088861"
      ]
     ]
    },
    {
     "body": "Use Claude in the **iteration** of design, development and improvement.\n\n- Design: From the requirements, get several options and put the trade-offs (cost, time, risk) in a table\n- Development: Have it make drafts, starting points, test cases and checklists; people finish them\n- Improvement: Hand over results (numbers, feedback) and ask “what is the one thing to change next?”\n- Develop the deliverable in Artifacts. Keep a note of what changed in each version\n- “The starting point is Claude's; the decision and the responsibility are a person's”\n\n### 🎓 Points to remember\n- **Design for reuse**: background in Project knowledge / procedures in Skills / calculations by code execution, so that **the result is the same whoever runs it**. **Being able to hand it to a colleague is also a design condition**\n\n> “There is only one design option” → “have several options and a comparison table produced.” “Adopt Claude's option as it is” is wrong.",
     "docs": [
      [
       "Artifacts",
       "https://support.claude.com/en/articles/9487310"
      ]
     ]
    },
    {
     "body": "There are three levels of bringing Claude into an existing workflow.\n\n- **Augment**: Replace one step in today's procedure (drafting, summarizing, classifying, translating) with Claude. Start here\n- **Redesign**: Rebuild the procedure assuming Claude exists (for example: people read everything → Claude classifies and people read only the exceptions)\n- **Automate**: Use connectors (Google Drive, Gmail, Slack and so on) to move data in and out automatically, while keeping human checkpoints\n- Start small: a low-impact step → measure the effect → widen\n- Do not break existing approval flows, permissions and record-keeping\n\n### 🎓 Points to remember\n- “An individual uses Claude” and “a team's workflow uses Claude” are different things. The value comes from **choosing which steps to hand over**\n- **Delegation mapping**: rate each step on Reversibility, Stakes (impact of errors), the need for human judgment or empathy, and Accountability, then assign it to **AI executes / human keeps / human reviews (shared)**\n- **Being good at drafting is no reason to hand over judgment.** Irreversible steps and steps that carry responsibility, such as approving, signing and sending, stay with people. Handing them over is **over-delegation**\n- Common mistakes: handing over the next step because the last one went well / a “shared” step with no actual reviewer / designing from a favorite feature instead of from the work\n- When other departments come to depend on the setup day to day, that is **the signal to hand it over to a Developer or Architect**\n\n> “Where to start” → “a step with lots of repetition and little impact from errors.” “Replace everything at once” is wrong.",
     "docs": [
      [
       "Connectors",
       "https://support.claude.com/en/articles/11175166"
      ]
     ]
    },
    {
     "body": "Tell stakeholders about **both value and limits**.\n\n- Express value in numbers (time, volume, error rate). “Convenient” and “amazing” do not land\n- Be clear about limits too: it can get facts wrong, may not know recent information, cannot carry responsibility for decisions, and has restrictions on confidential data\n- Align expectations: it is “a tool that makes drafts,” not “a tool that produces the right answer automatically”\n- Answer worries (being replaced, information leaks) with concrete measures (human checks, data policy)\n- Showing a small track record (a pilot) is the most persuasive\n\n### 🎓 Points to remember\n- State what it can and cannot do **without overstating or understating**, and **name the human review steps that remain**. “Fully automatic” and “Claude will handle it” are overstatements\n\n> “Explain the adoption to executives” → “numbers for the benefit together with limits and risk measures.” “List only what it can do” is wrong.",
     "docs": [
      [
       "About Anthropic",
       "https://www.anthropic.com/company"
      ]
     ]
    }
   ]
  },
  "5": {
   "intro": "The domain of **Project configuration, knowledge, connectors and instructions** (12%): where to put the assumptions of recurring work, and how to write instructions.",
   "obj": [
    {
     "body": "A Project consists of **instructions (custom instructions) plus knowledge (files)**.\n\n- In instructions: role, purpose, audience, tone, format, what not to do. Nothing that changes from conversation to conversation\n- In knowledge: glossary, internal rules, templates, good past examples. Remove material that has gone out of date\n- One Project is one job (“weekly report,” “contract review”). Put in everything and the instructions are diluted\n- Shared with a team, everyone works from the same setup. Check the confidentiality level of the files you share\n\n### 🎓 Points to remember\n- **Deciding where things go**: behavior rules in **standing instructions** / facts and files to refer to in the **knowledge base** / multi-step procedures in a **Skill** / decisions that accumulate within the project in **memory**\n- **Putting things in the wrong place, such as procedures in the instruction text or rules in knowledge, is the most common configuration mistake**\n- Skills belong to the account and can be used from any Project. **Configure a rule together with the material it refers to** (the instruction “cite sources” and the documents that are the sources)\n\n> “I paste the same files every time” → Project knowledge. “I give the same format instruction every time” → Project instructions.",
     "docs": [
      [
       "Projects",
       "https://support.claude.com/en/articles/9517075"
      ]
     ]
    },
    {
     "body": "- **Uploaded knowledge**: Files placed in a Project. Capacity is limited, so only what is needed. Replace files when they are updated (an old version left behind causes contradictions)\n- **Connectors**: Connect to outside services such as Google Drive, Gmail, Slack and Calendar so Claude can read (and in some cases write) what is in them. A connection works within your own permissions. **Connecting means the information in there reaches Claude**, so match it with confidentiality policy\n- Use a connection when you need the latest information or a volume too tedious to paste by hand. Fixed material can simply be uploaded\n- Disconnect what is no longer needed. Keep track of who is connected to what\n\n### 🎓 Points to remember\n- **Each connector has a fixed range of actions for its service** (for example, it can search and read mail but not send it). **An action outside that range failing is not a defect.** Use connectors your organization has approved\n- Choose between upload and connector by **freshness and maintenance effort**. Keep knowledge **current, relevant and free of duplicates**. If an old version remains, the wrong version gets quoted\n\n> “I want it to take the latest schedule and incoming mail into account” → connector. “A fixed internal policy” → upload. “May I connect confidential material?” → check the organization's policy first.",
     "docs": [
      [
       "Connectors",
       "https://support.claude.com/en/articles/11175166"
      ]
     ]
    },
    {
     "body": "System-level instructions (a Project's custom instructions, the organization's default instructions) are **assumptions that apply every time**. How to write them:\n\n- Role and purpose first: “You are an assistant for department X. The purpose is Y”\n- Output conventions: format, length, language, register, prohibitions\n- Decision conventions: “when unsure, ask instead of guessing,” “if it is not in the material, say so”\n- One or two examples. A short good example beats a long one\n- Keep within what will not collide with per-conversation instructions. Instructions that are too fine-grained are, if anything, harder to follow\n\n### 🎓 Points to remember\n- **Make standing instructions concrete.** “Be polite” and “be accurate” do not work. **The test is whether two people reading them would interpret them the same way**\n\n> “The output always has the same problem” → “write that convention into the system instructions.” Restating it in each conversation is wrong.",
     "docs": [
      [
       "Giving Claude a role with a system prompt",
       "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts"
      ]
     ]
    },
    {
     "body": "Configuration is **not finished when it is built**.\n\n- Reflect the elements of prompts that worked in the instructions. Add prohibitions from the cases that failed\n- Review files on a set date. When the organization's rules (formats, policy) change, fix the instructions and knowledge\n- After a change, compare before and after on the same input (to confirm the effect)\n- Decide who manages it (the owner). For a team-shared Project, announce changes\n\n### 🎓 Points to remember\n- **Configuration decays.** No error appears; only output quality falls quietly. **Isolate which layer is the cause (instructions, freshness of knowledge, Skill version, accumulated memory) and fix it**\n- **“It used to work” is the signal to suspect configuration decay.** Rewriting the prompt or changing models will not fix it\n\n> “Output quality has dropped recently” → “check whether files and assumptions have gone out of date and whether the instructions have grown too many.”",
     "docs": [
      [
       "Projects",
       "https://support.claude.com/en/articles/9517075"
      ]
     ]
    }
   ]
  },
  "6": {
   "intro": "**Governance, risk and responsible use** (15%): what you may and may not do, handling confidential data, organizational policy, ethics. The right answer is always on **the cautious side**.",
   "obj": [
    {
     "body": "**Appropriate**: drafting, summarizing, classifying, translating, generating ideas, help with code, organizing internal documents and the like, where **a person checks the result before using it**.\n**Inappropriate**:\n\n- Making important decisions automatically with no human check (hiring, credit, medical judgments and so on)\n- Entering personal or confidential information without permission\n- Impersonating others, creating misinformation, or uses prohibited by the terms (anything against Anthropic's usage policy)\n- Standing in for professional judgment (final legal, medical or tax decisions)\n- Some uses are not allowed by the organization even though Claude is good at them. Capability and permission are separate\n\n### 🎓 Points to remember\n- **Three classes of use case**: appropriate / appropriate with safeguards / inappropriate. Keep the reason for the classification in a form you can explain\n- **“A person reviews it” is not enough on its own.** It becomes a gate only when you define who checks what, and when (before use)\n- **Do not have AI make decisions that cannot be undone and whose responsibility cannot be transferred**, such as final medical or legal judgments or eligibility for benefits\n- **A Skill is software.** Before enabling one, check its provider, what it can reach in that session, and whether that is excessive for the purpose. **A Skill requests no permissions; it inherits whatever access the session it runs in has.** In-house does not mean verified. The decision is one of three: **enable / escalate to an admin / reject**. Apply least privilege to features and connectors in general\n\n> “Is this use case appropriate?” → the axes are “does a person hold the final decision?”, “is the data handling within what is permitted?” and “does it stay within terms and policy?”",
     "docs": [
      [
       "Usage policy",
       "https://www.anthropic.com/legal/aup"
      ]
     ]
    },
    {
     "body": "- Know the **classes of data**: public, internal only, confidential, personal information (PII), regulated (medical, financial and so on). Where each may go differs by class\n- **Check before entering**: may this information go into Claude (which plan, which settings)? When in doubt, anonymize (hide names and IDs) or do not enter it\n- **Minimum necessary**: hand over only the part the purpose needs. Do not paste the whole customer list\n- Data handling (whether it is used for training, how long it is kept, admin controls) differs by plan. Under organizational contracts (Team, Enterprise), admins set it\n- With a connector, the connected service's data is passed along. Confirm the scope of permissions and the policy first\n\n### 🎓 Points to remember\n- **Classify data before entering it**: public or anonymized data may be used / confidential data or data with names needs a policy check first / regulated data and credentials are not entered unless there is an approved route. **When in doubt, the stricter side**\n- **Anonymize or mask before uploading.** Having Claude anonymize after the upload is too late. Watch for identifying details left behind in free-text fields\n- **Incognito keeps things out of memory; whether the data may be entered at all is a separate question.** The organization's data-retention policy still applies\n\n> “I want to analyze a table that includes customers' personal information” → the answer is “check the organization's policy and remove unneeded personal information first.” “It's convenient, so just upload it” is wrong.",
     "docs": [
      [
       "Privacy and data handling",
       "https://privacy.anthropic.com/en/"
      ]
     ]
    },
    {
     "body": "An organization's AI policy is the rule for **what may be used, with which tool, on which data, with whose approval**.\n\n- Use the permitted tools and plans. Do not handle business data in a personal account\n- Follow the rules for each data class, the prohibited uses, and the requirements for records and audit\n- New uses go through the request and approval procedure. “Do it first and ask later” is wrong\n- When something is unclear, check with an admin, information security or legal\n- Policies change. Look at the latest version\n\n### 🎓 Points to remember\n- Policy compliance is **a habit kept up through small everyday decisions**. Compare actual use with the policy and correct the drift. **Tell apart whether drift comes from a flawed rule or from a lack of training and awareness**\n- **When people drift to unapproved means because the approved procedure is cumbersome, the corrective measure is to make the right path easy to use**\n\n> “A use the policy does not mention” → “check first.” “It isn't written down, so anything goes” is wrong.",
     "docs": [
      [
       "Claude for Enterprise",
       "https://www.anthropic.com/enterprise"
      ]
     ]
    },
    {
     "body": "Ethical issues:\n\n- **Bias and fairness**: Is there skew by attribute in the output? Especially in evaluation, selection and customer handling\n- **Transparency**: Disclose the use of AI to those who need to know. Do not present AI text as a human judgment\n- **Accountability**: Responsibility for results lies with the person and organization that used it. “The AI said so” is no excuse\n- **Impact on people**: Changes in work, misinformation, dependence. Pair the explanation of adoption with human checkpoints\n- **Copyright and sources**: Handling of other people's work, stating sources\n\n### 🎓 Points to remember\n- For **output that affects people**, such as hiring and evaluation, **check for skew and fairness**. **When unsure whether to disclose AI use, lean toward disclosing.** For high-impact problems, document the reasons and raise them with the responsible department\n\n> “Sending AI-written text to a customer as your own judgment” is a transparency problem. “Adopting an AI suggestion without grounds in a performance review” is a fairness and accountability problem.",
     "docs": [
      [
       "Anthropic's Responsible Scaling Policy",
       "https://www.anthropic.com/responsible-scaling-policy"
      ]
     ]
    }
   ]
  },
  "7": {
   "intro": "**How to fix things when they go wrong** (10%): isolate the cause → fix one thing at a time → make it efficient.",
   "obj": [
    {
     "body": "Main causes of poor output, and what to do:\n\n- **Vague instruction** (no audience, purpose or format) → add them\n- **Too little information** (no material supplied, or outdated) → supply or update it\n- **Too much information** (long conversation, oversized material) → summarize, start a new conversation, give only the needed part\n- **Task too big** → decompose it\n- **Model does not fit** (a small model for hard reasoning) → move up\n- **Instructions conflict** (Project instructions versus conversation instructions) → fix one of them\n- To isolate, “change just one thing on the same input and compare”\n\n### 🎓 Points to remember\n- Symptom → cause: **off-target from the very first reply → under-specified** (add context, constraints, format) / **stops following instructions midway → context overload** (summarize into a new conversation, persist in a Project) / **figures slightly off → code execution** / **used to be good, lately drifting → configuration decay** (check instructions, knowledge, Skills, memory) / a request that is impossible to begin with, such as exact future figures → mismatched expectations (reshape it into a range with assumptions, or a model) / precise statistics with no source → suspect fabrication and confirm with the original or an authoritative source\n- In the guide effective December 7 this domain is no longer separate: **isolating causes is spread across Domain 1 (prompt diagnosis) and Domain 5 (configuration decay), and efficiency goes to Domain 4 (designing reusable workflows)**\n\n> “The first move in identifying the cause” → “review the instruction and the information supplied.” “Change the model” is not the first move.",
     "docs": [
      [
       "Prompt engineering overview",
       "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      ]
     ]
    },
    {
     "body": "- After evaluating output, **reflect the result in the next prompt** (“last time it was too long; halve it,” “this wording does not suit customers”)\n- Find **patterns** across several results (always gets figures wrong → do the calculation separately)\n- Turn feedback from users (hard to read, not useful) into updates to instructions and knowledge\n- Record patterns that worked and reuse them (Projects, styles, Skills)\n- Look at the effect in numbers (time spent correcting, number of retries)\n\n### 🎓 Points to remember\n- **Making the same correction every time → promote the correction into a standing instruction or a Skill.** Results vary by person → unify with shared Skills and knowledge\n\n> “The same failure keeps happening” → “reflect it in the instructions to prevent a recurrence.” “Fix it by hand each time” is wrong.",
     "docs": [
      [
       "Projects",
       "https://support.claude.com/en/articles/9517075"
      ]
     ]
    },
    {
     "body": "- **Turn repetition into a system**: Projects, templates, Skills, connectors\n- **Check only where it is needed**: Not reading everything; narrow to figures, proper nouns, conclusions and anything going outside\n- **Split models by step**: Pre-reading on Haiku, important judgments on Opus\n- **Do not cram it into one pass**: Decomposing cuts rework and ends up faster\n- **Measure**: Compare time, volume and error rate before and after adoption, and roll back steps where it is not helping\n\n### 🎓 Points to remember\n- Want to analyze regulated data → check whether there is an approved route; if not, stop and go to an admin / offered a Skill of unknown origin → do not enable it on your own judgment; send it to organizational review / **do not want to mix two companies' confidential information → a separate Project per company, with Project-level memory** / external deliverables and irreversible actions → always go through human review and approval\n\n> In an “efficiency” question, “skip the checking” is wrong. “Narrow what is checked, and systematize” is right.",
     "docs": [
      [
       "Skills",
       "https://support.claude.com/en/articles/12512180"
      ]
     ]
    }
   ]
  }
 },
 "appendix": {
  "title": "Terms and decision rules at a glance",
  "body": "### Product features\n- **Projects**: Instructions plus knowledge as the standing setup for recurring work. Can be shared with a team\n- **Research**: Investigates across sources and reports with citations. Read what the sources say\n- **Artifacts**: Standalone deliverables. Developed across versions, shared, downloaded\n- **Memory**: Remembers across conversations\n- **Skills**: Reuses a fixed procedure\n- **Connectors**: Connect to Google Drive, Gmail, Slack and so on. The connected data is passed along\n\n### Models\n- **Haiku** fast and cheap (classification, extraction, volume) / **Sonnet** balanced (the default) / **Opus** most intelligent (complex, important)\n\n### Thinking that is always on the right side\n- Output is a draft. A person checks before use. Focus the check where the impact is large\n- Be specific, decompose, fix one thing at a time\n- For confidential data, check the policy before entering it. Minimum necessary, anonymized\n- Keep the final decision with a person. Both extremes (all AI, all human) are wrong\n- For a use the policy does not cover, check first\n\n### 🎓 Decision rules at a glance\n- Off-target from the first reply → **under-specified**. Add context, constraints and format\n- Stops following instructions midway → **context overload**. Summarize into a new conversation, or persist in a Project\n- Figures slightly off → recalculate with **code execution**\n- Used to be good, lately drifting → **configuration decay**. Check instructions, knowledge, Skills and memory\n- An impossible request (exact future figures) → **mismatched expectations**. Reshape into a range with assumptions, or a model\n- Precise statistics with no source → **suspect fabrication**; confirm with the original or an authoritative source\n- Making the same correction every time → **promote it to a standing instruction or a Skill**\n- Results vary by person → unify with **shared Skills and knowledge**\n- Want to analyze regulated data → check for an approved route. If none, stop and go to an admin\n- Offered a Skill of unknown origin → do not enable it on your own; **send it to organizational review**\n- Do not want to mix two companies' confidential data → **a Project per company, with Project-level memory**\n- External deliverables and irreversible actions → always through **human review and approval**\n- Create a Project? → when **two or more** apply: recurring / same background / consistent output format\n- Is human review mandatory? → the four thresholds: **Stakes, Reversibility, Audience, Regulatory exposure**"
 }
};
