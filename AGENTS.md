# SWEAI Builder Product Loader

This repository uses SWEAI Builder as a pinned lifecycle dependency throughout the software lifecycle. SWEAI Builder is the complete `sweai-builder` repository, mounted here as a Git submodule at `.ai-engineering/`.

Before doing any work:

1. If `.ai-engineering/AGENTS.md` is missing and `.gitmodules` declares `.ai-engineering`, run `git submodule update --init --recursive`.
2. Read and follow `.ai-engineering/AGENTS.md`. That file is the SWEAI Builder source loader.
3. Let the source loader resolve the operating contract at `.ai-engineering/.bootstrap/AGENTS.md`.
4. Resolve `contract:` references relative to the directory containing the operating contract, which is `.ai-engineering/.bootstrap/`. They are not relative directly to `.ai-engineering/`.
5. Resolve product artifacts such as `GOAL.md`, `SPEC.md`, `PLAN.md`, `EXECUTION.md`, and `docs/` from this repository root.

When the user says `run`, `start`, or equivalent, execute the state-aware workflow defined by the operating contract.

## Installation integrity

This repository commits `.gitmodules`, the `.ai-engineering` gitlink with Git mode `160000`, and its own product-local loaders and configuration. It does not commit the individual files contained in `.ai-engineering/`; those belong to the nested `sweai-builder` repository.

`.ai-engineering/.bootstrap/` is visible in this checkout because it belongs to that nested submodule repository. Its files are not stored as files in this repository's history; this repository stores only the submodule commit pointer.

Reject every fallback:

- a symbolic link at `.ai-engineering` with Git mode `120000` is an invalid installation;
- a product-owned `.bootstrap/` directory is an invalid installation;
- a vendored copy of SWEAI Builder files is an invalid installation.

Advance the pinned SWEAI Builder commit only through a reviewed dependency-update pull request. Do not follow an unpinned branch automatically.

If the submodule cannot be initialized or the operating contract cannot be read, stop and report the exact problem and the recovery command `git submodule update --init --recursive`.
