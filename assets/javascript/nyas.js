/*
 * nyas.js — browser client for the NYAS gateway server.
 *
 * Drop this into your frontend website with a plain <script> tag (no bundler or
 * module config needed). It exposes a global: `Nyas`, plus `NyasError` and
 * `createNyasClient`. It only uses browser-native APIs (fetch, URLSearchParams).
 *
 * Usage:
 *   <script src="nyas.js"></script>
 *   <script>
 *     (async () => {
 *       const api = await createNyasClient({
 *         baseUrl: 'https://nonarithmetical-unnervedly-darien.ngrok-free.dev',
 *         token: 'nyas_REPLACE_WITH_REAL_TOKEN',
 *       });
 *       console.log(api.models);                       // discovered addons
 *       await api.accountDb.post('/register', { fullName, email, password });
 *       await api.accountDb.post('/login', { email, password });
 *       await api.ai.post('/chat', { message: 'hi' });
 *     })();
 *   </script>
 *
 * Without discovery (you know the model name):
 *   const api = new Nyas({ baseUrl, token });
 *   await api.model('account-db').post('/register', body);
 *
 * If you use a bundler (Vite/Webpack) you can still import it for its side
 * effects and use the global:
 *   import './nyas.js';
 *   const { Nyas, createNyasClient, NyasError } = window;
 */
(function (root) {
  'use strict';

  // Names that can't be model accessors because they're core SDK methods.
  var RESERVED = {
    init: 1, request: 1, model: 1, listModels: 1, ping: 1,
    get: 1, post: 1, put: 1, patch: 1, delete: 1,
    models: 1, baseUrl: 1, token: 1, setToken: 1,
    _headers: 1, _url: 1, _models: 1, _discovered: 1
  };

  function joinPath(base, path) {
    if (path === undefined || path === null || path === '') return base || '/';
    var p = String(path).charAt(0) === '/' ? String(path) : '/' + String(path);
    return (base + p).replace(/\/{2,}/g, '/');
  }

  /** Error thrown for any non-2xx response (or a network failure). */
  function NyasError(message, status, body) {
    var err = Error.call(this, message);
    this.name = 'NyasError';
    this.message = message;
    this.status = status;   // HTTP status (0 = network failure)
    this.body = body;        // parsed response body (JSON, text, or null)
    if (Error.captureStackTrace) Error.captureStackTrace(this, NyasError);
  }
  NyasError.prototype = Object.create(Error.prototype);
  NyasError.prototype.constructor = NyasError;

  /**
   * @param {Object} opts
   * @param {string} opts.baseUrl  Server URL, e.g. https://....ngrok-free.dev
   * @param {string} [opts.token]  Master token (x-master-token). Needed for all
   *                               token-gated endpoints; GET / works without it.
   */
  function Nyas(opts) {
    opts = opts || {};
    if (!opts.baseUrl) throw new TypeError('Nyas: `baseUrl` is required');
    this.baseUrl = String(opts.baseUrl).replace(/\/+$/, '');
    this.token = opts.token || null;
    this._models = [];
    this._discovered = false;
  }

  Nyas.prototype.setToken = function (token) { this.token = token || null; };

  // ---- internals ---------------------------------------------------------

  Nyas.prototype._headers = function (extra) {
    var h = { 'ngrok-skip-browser-warning': 'true' };
    if (extra) for (var k in extra) h[k] = extra[k];
    if (this.token) h['x-master-token'] = this.token;
    return h;
  };

  Nyas.prototype._url = function (path, query) {
    var url = /^https?:\/\//i.test(path)
      ? path
      : this.baseUrl + (String(path).charAt(0) === '/' ? path : '/' + path);
    if (query && typeof query === 'object') {
      var keys = Object.keys(query);
      if (keys.length) url += (url.indexOf('?') >= 0 ? '&' : '?') + new URLSearchParams(query).toString();
    }
    return url;
  };

  // ---- low-level request -------------------------------------------------

  /** Lowest-level call. Throws NyasError on non-2xx. Resolves to parsed JSON. */
  Nyas.prototype.request = function (method, path, opts) {
    opts = opts || {};
    var self = this;
    return new Promise(function (resolve, reject) {
      var init = { method: method, headers: self._headers(opts.headers) };
      if (opts.body !== undefined && opts.body !== null) {
        init.headers['Content-Type'] = init.headers['Content-Type'] || 'application/json';
        init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
      }
      fetch(self._url(path, opts.query), init).then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
          if (!res.ok) {
            var msg = (data && (data.error || data.message)) || ('Request failed (' + res.status + ')');
            reject(new NyasError(msg, res.status, data));
            return;
          }
          resolve(opts.raw ? { status: res.status, headers: res.headers, data: data } : data);
        });
      }).catch(function (e) {
        reject(new NyasError('Network error: ' + e.message, 0, null));
      });
    });
  };

  // ---- root-level convenience --------------------------------------------

  Nyas.prototype.get    = function (path, opts) { return this.request('GET', path, opts); };
  Nyas.prototype.post   = function (path, body, opts) { opts = opts || {}; opts.body = body; return this.request('POST', path, opts); };
  Nyas.prototype.put    = function (path, body, opts) { opts = opts || {}; opts.body = body; return this.request('PUT', path, opts); };
  Nyas.prototype.patch  = function (path, body, opts) { opts = opts || {}; opts.body = body; return this.request('PATCH', path, opts); };
  Nyas.prototype.delete = function (path, opts) { return this.request('DELETE', path, opts); };

  /** Liveness check — hits the open GET / directory. */
  Nyas.prototype.ping = function () { return this.get('/'); };

  // ---- model discovery ---------------------------------------------------

  /** Fetch the model list from GET /. Returns the raw list. */
  Nyas.prototype.listModels = function () {
    var self = this;
    return this.get('/').then(function (dir) {
      self._models = Array.isArray(dir.models) ? dir.models : [];
      return self._models;
    });
  };

  /**
   * Discover models and build ergonomic accessors (e.g. api.accountDb, api.ai).
   * Call once after constructing. Resolves to the client itself for chaining.
   */
  Nyas.prototype.init = function () {
    var self = this;
    return this.listModels().then(function () {
      self._discovered = true;
      self._models.forEach(function (m) {
        var keys = [];
        if (m.displayName) keys.push(m.displayName);
        if (m.name) keys.push(m.name);
        keys.forEach(function (key) {
          if (RESERVED[key]) return;            // never shadow core methods
          Object.defineProperty(self, key, {
            value: self.model(m.name),
            enumerable: true,
            configurable: true
          });
        });
      });
      return self;
    });
  };

  /** Discovered models: [{ name, displayName, base, port }, ...]. */
  Object.defineProperty(Nyas.prototype, 'models', {
    get: function () { return this._models; },
    enumerable: true
  });

  /**
   * Build a helper bound to one model's base path (works with or without init()).
   * @param {string} name  model name as the server knows it, e.g. 'account-db'
   */
  Nyas.prototype.model = function (name) {
    var base = '/' + String(name).replace(/^\/+/, '');
    var self = this;
    return {
      name: name,
      base: base,
      get:    function (path, opts) { return self.request('GET', joinPath(base, path), opts); },
      post:   function (path, body, opts) { opts = opts || {}; opts.body = body; return self.request('POST', joinPath(base, path), opts); },
      put:    function (path, body, opts) { opts = opts || {}; opts.body = body; return self.request('PUT', joinPath(base, path), opts); },
      patch:  function (path, body, opts) { opts = opts || {}; opts.body = body; return self.request('PATCH', joinPath(base, path), opts); },
      delete: function (path, opts) { return self.request('DELETE', joinPath(base, path), opts); },
      /** Model liveness probe (GET /<model>/). */
      health: function () { return self.request('GET', joinPath(base, '/'), {}); }
    };
  };

  // ---- exports to the global --------------------------------------------

  root.Nyas = Nyas;
  root.NyasError = NyasError;
  /** One-liner: construct + init. Resolves to a ready-to-use Nyas client. */
  root.createNyasClient = function (opts) { return new Nyas(opts).init(); };
})(typeof self !== 'undefined' ? self : this);
