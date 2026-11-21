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
};
window.QUESTIONS = window.QUESTIONS || {};
