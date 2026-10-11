# WWI Dogfight Simulator

Full specification: @docs/GAME_SPEC.md
Current status: read docs/PROGRESS.md at the start of every session.
Design decisions: docs/DECISIONS.md. Aircraft data: docs/AIRCRAFT_DATA.md.

## Commands
- npm run dev    start the dev server
- npm test       run all tests
- npm run build  production build

## Rules
- Work on one phase at a time. Do not start the next phase
  until I confirm the current one passes its acceptance tests.
- Always propose a plan in plan mode before writing code.
- Use SI units internally. Physics constants go in
  src/aircraft/*.js data files, never inline in code.
- Never invent aircraft data. Cite a source or mark it as an
  estimate with a reason in docs/AIRCRAFT_DATA.md.
- Write or update tests for every physics, weapons and AI change.
  Run npm test before saying a task is done.
- Keep files under about 400 lines; split modules when larger.
- I am the product owner, not a programmer. Explain results in
  plain English, tell me exactly what to test in the browser,
  and list any decisions you need from me.
- At the end of each task, update docs/PROGRESS.md with what was
  done, what is left, and known issues.
- Record significant design choices and their reasons in
  docs/DECISIONS.md.
