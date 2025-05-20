# AIWebFramework

This project is a Node.js/Express server with a React-based frontend. It requires Node.js 18+.

## Running Locally

```bash
npm install
npm run dev
```

## Type Checking

To run the TypeScript checks used by `npm run check`, install dependencies first:

```bash
npm install
npm run check
```

## Deployment Notes

When deploying to production (`NODE_ENV=production`), you **must** define the `SESSION_SECRET` environment variable. The server will refuse to start without it and session cookies will be marked as secure.
