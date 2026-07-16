<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git Workflow

Before making any code changes:

1. Ensure the working tree is clean. If it is not, stop and ask me.
2. Run:
   ```bash
   git fetch origin
   git pull --rebase origin main
   ```
3. If `git pull` fails or has conflicts, stop and ask me.

After making changes:

1. Run any relevant tests.
2. Commit the changes with a descriptive commit message.
3. Before pushing, run:
   ```bash
   git fetch origin
   git pull --rebase origin main
   ```
4. If there are conflicts, stop and ask me.
5. Push the changes to `origin/main`.
