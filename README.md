# AIWebFramework

This repository contains a web framework built with Node.js and TypeScript.

## Development Setup

Before running the project's type checks, make sure all dependencies are installed. The `.codex/setup.sh` script automatically runs `npm install` to install the required packages when the Codex environment is created.

To run checks locally, install dependencies and then execute the check script:

```bash
npm install && npm run check
```

Running `npm run check` without installing dependencies first may fail if packages are missing.

