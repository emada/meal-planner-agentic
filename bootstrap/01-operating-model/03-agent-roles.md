# Agent roles

Roles are responsibilities. They do not require separate models or processes.

| Role | Responsibility | Must not decide alone |
| --- | --- | --- |
| Lead agent | Assist discovery, draft specifications and plans, deliver the first slice | Product direction, approval, or risk acceptance |
| Orchestrator | Decompose work, coordinate agents, consolidate evidence | Product direction, risk acceptance, or merge approval |
| Researcher | Inspect code, requirements, and failures | Production changes |
| Implementer | Produce a bounded change | Approval of its own change |
| Tester | Build and challenge verification | Whether the solution provides user value |
| Reviewer | Find defects and intent drift | Business priorities |
| Security reviewer | Identify attack surfaces and missing controls | Risk acceptance on behalf of the organisation |
| Privacy reviewer | Map data and processing risks | Legal basis or final legal decision |

## Independence rule

For material changes, reviewers inspect the actual diff and evidence. They do not trust only the implementer's summary.
