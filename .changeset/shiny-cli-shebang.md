---
"@ludovicm67/mp4-tools": patch
"@ludovicm67/webm-tools": patch
"@ludovicm67/ogg-tools": patch
---

Add a `#!/usr/bin/env node` shebang to the CLI entry points so the published `bin` executables run with Node instead of being interpreted as shell scripts (which caused `syntax error near unexpected token '('` and `import: unable to open X server` errors when run via `npx`).
