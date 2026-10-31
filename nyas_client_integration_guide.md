# Nyas Frontend Integration Guide

This guide covers everything you need to know about setting up and using the `nyas.js` client SDK to interact with the NYAS gateway server, including model discovery, error handling, and working with the account database endpoints.

---

## 1. Including `nyas.js`

`nyas.js` is built as a lightweight, browser-native script with zero external dependencies (it relies strictly on standard browser APIs like `fetch` and `URLSearchParams`).

### Plain HTML (No Bundler)

```html
<script src="nyas.js"></script>
<script>
  // Globals are now available on window:
  // - Nyas
  // - NyasError
  // - createNyasClient
</script>
```

### Modern JS Environment / Bundler (Vite, Webpack, ESBuild)

```javascript
import './nyas.js'; // Executed for side-effects; defines globals

const { Nyas, NyasError, createNyasClient } = window;
```

---

## 2. Quick Start

```javascript
const api = await createNyasClient({
  baseUrl: 'https://nonarithmetical-unnervedly-darien.ngrok-free.dev',
  token: 'nyas_REPLACE_WITH_REAL_TOKEN',
});

// View dynamically discovered addons
console.log(api.models); 

// Model endpoints called via auto-generated accessors
await api.accountDb.post('/register', { 
  fullName: 'Jane Doe', 
  email: 'jane@example.com', 
  password: 'password123' 
});

await api.accountDb.post('/login', { 
  email: 'jane@example.com', 
  password: 'password123' 
});

await api.ai.post('/chat', { message: 'Hello AI!' });
```

`createNyasClient(opts)` executes `new Nyas(opts).init()`. It queries `GET /` on the server to discover mounted models and generates camelCase and raw-name helper accessors.

---

## 3. Configuration & Options

| Option | Required | Description |
|---|---|---|
| `baseUrl` | **Yes** | Gateway domain URL. Use HTTPS when accessing hosted endpoints (e.g., ngrok tunnel). Use `http://localhost:3000` only for local machine-to-machine dev. |
| `token` | Recommended | The master authentication token starting with `nyas_`. Required for protected routes. `GET /` is accessible without it. |

### Manual Initialization

If you prefer explicit control over client setup:

```javascript
const api = new Nyas({ baseUrl, token });
await api.init();
```

### Rotating Tokens at Runtime

When authentication state changes or backend credentials rotate:

```javascript
api.setToken('nyas_NEW_MASTER_TOKEN');
```

---

## 4. Model Discovery & Dynamic Accessors

Upon calling `.init()`, `nyas.js` exposes:
- `api.models`: An array listing available services, e.g., `[{ name: "account-db", displayName: "accountDb", base: "/account-db", port: 3001 }]`.
- Bound helper objects corresponding to `displayName` and `name`:
  - `account-db` mapped to `api.accountDb` and `api['account-db']`
  - `ai` mapped to `api.ai`

```javascript
// Accessing auto-generated helpers
api.accountDb.post('/login', { email, password });
api.ai.post('/chat', { message });
```

---

## 5. Model Helper Methods

Every helper bound to a model exposes standard REST methods. All relative endpoints passed to these methods are auto-prefixed with the model's base path (e.g., `/register` becomes `/account-db/register`).

| Method | Signature | Description |
|---|---|---|
| `get(path, opts?)` | `api.<model>.get('/items', { query: { page: 1 } })` | Executes a `GET` request |
| `post(path, body, opts?)` | `api.<model>.post('/create', { key: 'val' })` | Executes a `POST` request with JSON body |
| `put(path, body, opts?)` | `api.<model>.put('/update', { key: 'val' })` | Executes a `PUT` request with JSON body |
| `patch(path, body, opts?)` | `api.<model>.patch('/update', { key: 'val' })` | Executes a `PATCH` request with JSON body |
| `delete(path, opts?)` | `api.<model>.delete('/remove')` | Executes a `DELETE` request |
| `health()` | `api.<model>.health()` | Hits `GET /<model>/` for liveness probes |

---

## 6. Manual Model Execution (Without Discovery)

When model discovery (`.init()`) is unnecessary or should be bypassed, you can target specific models directly using `.model(name)`:

```javascript
const api = new Nyas({ baseUrl, token });

// Ready immediately — no remote discovery round-trip needed
await api.model('account-db').post('/register', payload);
await api.model('ai').get('/status');
```

---

## 7. Direct & Low-Level Requests

### Gateway Root Endpoints
```javascript
await api.get('/');             // Query server metadata and mounted addons directory
await api.post('/custom', body); // Perform custom route requests directly on baseUrl
```

### Full-Control Low-Level Request
```javascript
await api.request('POST', '/account-db/register', {
  body: { email, password },
  query: { debug: true },
  headers: { 'X-Custom-Header': 'value' },
  raw: true // Returns { status, headers, data } instead of unwrapped JSON body
});
```

---

## 8. Automatic Headers & Formatting

The SDK handles common browser header requirements on every outgoing request automatically:

1. `x-master-token`: Automatically injected using the configured `token`.
2. `ngrok-skip-browser-warning: true`: Bypasses default warning landing pages on ngrok free-tier URLs.
3. `Content-Type: application/json`: Added whenever a body payload is passed.

---

## 9. Error Handling & `NyasError`

Non-`2xx` responses and network loss raise an instance of `NyasError`.

```javascript
try {
  await api.accountDb.post('/login', { email, password });
} catch (err) {
  if (err instanceof NyasError) {
    console.error(`HTTP Status: ${err.status}`);
    console.error(`Message: ${err.message}`);
    console.dir(err.body); // Parsed error response payload from server

    switch (err.status) {
      case 0:
        alert('Network unreachable. Check connection.');
        break;
      case 400:
        alert('Missing required fields.');
        break;
      case 401:
        alert('Invalid credentials.');
        break;
      case 409:
        alert('Email is already registered.');
        break;
      default:
        alert(err.message);
    }
  } else {
    throw err; // Re-throw non-API unexpected JavaScript exceptions
  }
}
```

---

## 10. Account DB Specifics & Field-Naming Notice

When working with `/account-db`, take note of the response field formatting conventions between registration and login endpoints:

- **`/register` Response (`snake_case`)**:
  ```json
  {
    "account_id": "acc_12345",
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "created_at": "2026-10-31T08:00:00Z"
  }
  ```
- **`/login` Response (`camelCase`)**:
  ```json
  {
    "accountId": "acc_12345",
    "fullName": "Jane Doe",
    "email": "jane@example.com"
  }
  ```

### End-to-End Auth Example

```html
<script src="nyas.js"></script>
<script>
  async function runAuthFlow() {
    const api = await createNyasClient({
      baseUrl: 'https://nonarithmetical-unnervedly-darien.ngrok-free.dev',
      token: 'nyas_REPLACE_WITH_REAL_TOKEN',
    });

    try {
      // 1. Registration
      const regUser = await api.accountDb.post('/register', {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'SecurePassword123!'
      });
      console.log('Registered Account ID:', regUser.account_id);

      // 2. Authentication
      const authUser = await api.accountDb.post('/login', {
        email: 'jane@example.com',
        password: 'SecurePassword123!'
      });
      console.log('Logged In Account ID:', authUser.accountId);

    } catch (err) {
      if (err.status === 409) {
        console.warn('Account exists. Proceeding to login directly.');
      } else {
        console.error('Authentication Error:', err.message);
      }
    }
  }

  runAuthFlow();
</script>
```

---

## 11. CORS & Browser Notes

- **Preflight Operations**: CORS and preflight handling (`OPTIONS`) are satisfied automatically through backend headers configured for cross-origin environments.
- **Hosted Environments vs Localhost**: Always configure client requests to HTTPS remote domains when hosting frontends online to prevent mixed-content blocking.
- **Readable Error Payloads**: Error responses sent from the server maintain CORS headers, ensuring detailed error bodies and status codes remain accessible inside the client `catch` block.

---

## 12. API Reference Summary

### Global Exports
- `Nyas`: Main client class instance constructor (`new Nyas(opts)`).
- `NyasError`: Error class thrown on request failures.
- `createNyasClient(opts)`: Async helper function that creates and initializes a client instance in one step.

### `Nyas` Methods
- `.init()`: Queries root discovery route and constructs model-bound accessors.
- `.model(name)`: Constructs a model request helper on demand without running full discovery.
- `.setToken(token)`: Updates active token on runtime.
- `.ping()`: Queries root server route (`GET /`) to verify server connection.