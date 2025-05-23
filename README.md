# AIWebFramework

This project is a collection of experiments that combine a Node.js backend and a Vite powered client.  Environment variables are used to configure access to third‑party services and to keep secrets out of the codebase.

## Environment Variables

Create a `.env` file in the project root (and in `didit-integration` if you use the identity verification demo) and define the following variables:

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | Secret used to sign session cookies. |
| `ENCRYPTION_KEY` | 32‑byte key for the encryption service. |
| `GOOGLE_API_KEY` | API key for Google Generative AI features. |
| `HUGGINGFACE_API_KEY` | Token for Hugging Face API access. |
| `NEWS_API_KEY` | Key for News API queries. |
| `DIDIT_API_KEY` | API key for Didit.me integration. |
| `DIDIT_API_SECRET` | API secret for Didit.me integration. |
| `DIDIT_BASE_URL` / `DIDIT_API_URL` | Base URL of the Didit API. |
| `DIDIT_CLIENT_ID` | OAuth client ID for Didit.me. |
| `DIDIT_CLIENT_SECRET` | OAuth client secret for Didit.me. |
| `DIDIT_AUTH_URL` | Authorization endpoint for Didit.me. |
| `DIDIT_TOKEN_URL` | Token endpoint for Didit.me. |
| `DIDIT_ENABLED` | Enable/disable Didit integration ("true" or "false"). |
| `DATABASE_URL` | Connection string for the database. |
| `VITE_HERE_API_KEY` | API key for Here maps used by the client. |

Other environment variables such as `NODE_ENV` and `PORT` may also be set depending on your deployment.

### Generating secure values

Use strong random strings for all secrets. On Unix systems you can run:

```bash
openssl rand -hex 32
```

to generate a 32‑byte value suitable for `SESSION_SECRET` or `ENCRYPTION_KEY`. Keep all API keys private and never commit them to version control.


