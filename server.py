from __future__ import annotations

import json
import os
import secrets
import time
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen

PORT = int(os.environ.get('PORT', '5500'))
REMOTE_BASE = 'https://dodanhvu.dpdns.org'
AUTOPEE_BASE = 'https://api.autopee.com'
MAIL_BASE = 'https://tools.dongvanfb.net/api'
OTISTX_BASE = 'https://otistx.com'
APP_USERNAME = os.environ.get('APP_USERNAME', 'hieunguyen01')
APP_PASSWORD = os.environ.get('APP_PASSWORD', '1')
OTISTX_API_KEY = os.environ.get('OTISTX_API_KEY', '')
SESSION_COOKIE_NAME = 'ts_auth'
SESSION_TTL = 60 * 60 * 24 * 7
SESSIONS: dict[str, float] = {}


class ProxyHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_OPTIONS(self) -> None:
        if self.path.startswith(('/api/', '/autopee-api/', '/mail-api/', '/otistx-api/', '/auth/')):
            self.send_response(204)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Proxy-Cookie')
            self.end_headers()
            return
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/auth/logout':
            self._handle_logout()
            return
        if path == '/auth/status':
            self._handle_auth_status()
            return

        if path.startswith(('/api/', '/autopee-api/', '/mail-api/', '/otistx-api/')):
            if not self._is_authenticated():
                self._send_json(401, {'error': 'Unauthorized'})
                return
            if path.startswith('/api/'):
                self._proxy_request('GET', REMOTE_BASE, self.path)
                return
            if path.startswith('/autopee-api/'):
                self._proxy_request('GET', AUTOPEE_BASE, self.path.replace('/autopee-api', '', 1))
                return
            if path.startswith('/mail-api/'):
                self._proxy_request('GET', MAIL_BASE, self.path.replace('/mail-api', '', 1))
                return
            if path.startswith('/otistx-api/'):
                self._proxy_request('GET', OTISTX_BASE, self.path.replace('/otistx-api', '', 1))
                return

        if self._needs_page_auth(path) and not self._is_authenticated():
            self._redirect_to_login(self.path)
            return

        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/auth/login':
            self._handle_login()
            return

        if path.startswith(('/api/', '/autopee-api/', '/mail-api/', '/otistx-api/')):
            if not self._is_authenticated():
                self._send_json(401, {'error': 'Unauthorized'})
                return
            if path.startswith('/api/'):
                self._proxy_request('POST', REMOTE_BASE, self.path)
                return
            if path.startswith('/autopee-api/'):
                self._proxy_request('POST', AUTOPEE_BASE, self.path.replace('/autopee-api', '', 1))
                return
            if path.startswith('/mail-api/'):
                self._proxy_request('POST', MAIL_BASE, self.path.replace('/mail-api', '', 1))
                return
            if path.startswith('/otistx-api/'):
                self._proxy_request('POST', OTISTX_BASE, self.path.replace('/otistx-api', '', 1))
                return

        self.send_error(405, 'Method not allowed')

    def do_PUT(self) -> None:
        if self.path.startswith('/autopee-api/'):
            if not self._is_authenticated():
                self._send_json(401, {'error': 'Unauthorized'})
                return
            self._proxy_request('PUT', AUTOPEE_BASE, self.path.replace('/autopee-api', '', 1))
            return
        self.send_error(405, 'Method not allowed')

    def do_PATCH(self) -> None:
        if self.path.startswith('/autopee-api/'):
            if not self._is_authenticated():
                self._send_json(401, {'error': 'Unauthorized'})
                return
            self._proxy_request('PATCH', AUTOPEE_BASE, self.path.replace('/autopee-api', '', 1))
            return
        self.send_error(405, 'Method not allowed')

    def do_DELETE(self) -> None:
        if self.path.startswith('/autopee-api/'):
            if not self._is_authenticated():
                self._send_json(401, {'error': 'Unauthorized'})
                return
            self._proxy_request('DELETE', AUTOPEE_BASE, self.path.replace('/autopee-api', '', 1))
            return
        self.send_error(405, 'Method not allowed')

    def _needs_page_auth(self, path: str) -> bool:
        if path in ('/login.html', '/favicon.ico'):
            return False
        if path == '/' or path.endswith('.html'):
            return True
        return False

    def _is_authenticated(self) -> bool:
        token = self._get_session_token()
        if not token:
            return False
        expires_at = SESSIONS.get(token)
        if not expires_at or expires_at < time.time():
            SESSIONS.pop(token, None)
            return False
        SESSIONS[token] = time.time() + SESSION_TTL
        return True

    def _get_session_token(self) -> str:
        raw = self.headers.get('Cookie', '')
        if not raw:
            return ''
        jar = cookies.SimpleCookie()
        try:
            jar.load(raw)
        except cookies.CookieError:
            return ''
        morsel = jar.get(SESSION_COOKIE_NAME)
        return morsel.value if morsel else ''

    def _handle_login(self) -> None:
        body = self._read_json_body()
        username = str(body.get('username', '')).strip()
        password = str(body.get('password', '')).strip()
        if username != APP_USERNAME or password != APP_PASSWORD:
            self._send_json(401, {'error': 'Sai tai khoan hoac mat khau.'})
            return

        token = secrets.token_urlsafe(24)
        SESSIONS[token] = time.time() + SESSION_TTL
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Set-Cookie', self._build_session_cookie(token, SESSION_TTL))
        self.end_headers()
        self.wfile.write(json.dumps({'ok': True, 'username': APP_USERNAME}).encode('utf-8'))

    def _handle_logout(self) -> None:
        token = self._get_session_token()
        if token:
            SESSIONS.pop(token, None)
        next_url = '/login.html'
        self.send_response(302)
        self.send_header('Location', next_url)
        self.send_header('Set-Cookie', self._build_session_cookie('', 0))
        self.end_headers()

    def _handle_auth_status(self) -> None:
        self._send_json(200, {'authenticated': self._is_authenticated()})

    def _build_session_cookie(self, token: str, max_age: int) -> str:
        parts = [
            f'{SESSION_COOKIE_NAME}={token}',
            'Path=/',
            f'Max-Age={max_age}',
            'HttpOnly',
            'SameSite=Lax',
        ]
        return '; '.join(parts)

    def _redirect_to_login(self, current_path: str) -> None:
        target = '/login.html?next=' + quote(current_path or '/')
        self.send_response(302)
        self.send_header('Location', target)
        self.end_headers()

    def _read_json_body(self) -> dict:
        length = int(self.headers.get('Content-Length', '0') or '0')
        raw = self.rfile.read(length) if length > 0 else b'{}'
        try:
            return json.loads(raw.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            return {}

    def _send_json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)

    def _proxy_request(self, method: str, base_url: str, path: str) -> None:
        target = base_url + path
        body = None
        if method in {'POST', 'PUT', 'PATCH'}:
            length = int(self.headers.get('Content-Length', '0') or '0')
            body = self.rfile.read(length) if length > 0 else None

        headers = {
            'User-Agent': self.headers.get('User-Agent', 'LocalProxy/1.0'),
            'Accept': self.headers.get('Accept', 'application/json, text/plain, */*'),
        }
        if self.headers.get('Content-Type'):
            headers['Content-Type'] = self.headers['Content-Type']
        if self.headers.get('Authorization'):
            headers['Authorization'] = self.headers['Authorization']
        if self.headers.get('X-Proxy-Cookie'):
            headers['Cookie'] = self.headers['X-Proxy-Cookie']
        if base_url == OTISTX_BASE:
            if not OTISTX_API_KEY:
                self._send_json(500, {'error': 'OTISTX_API_KEY chua duoc cau hinh tren server.'})
                return
            headers['X-API-Key'] = OTISTX_API_KEY

        request = Request(target, data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=60) as response:
                data = response.read()
                self.send_response(response.status)
                content_type = response.headers.get('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(data)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
        except HTTPError as exc:
            if exc.code == 404 and base_url == AUTOPEE_BASE and not path.startswith('/api/'):
                self._proxy_request(method, base_url, '/api' + path)
                return
            data = exc.read()
            self.send_response(exc.code)
            self.send_header('Content-Type', exc.headers.get('Content-Type', 'application/json; charset=utf-8'))
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except URLError as exc:
            payload = json.dumps({'error': f'Khong ket noi duoc API: {exc.reason}'}, ensure_ascii=False).encode('utf-8')
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(payload)


def main() -> None:
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = ThreadingHTTPServer(('0.0.0.0', PORT), ProxyHandler)
    print(f'Serving on http://127.0.0.1:{PORT}')
    server.serve_forever()


if __name__ == '__main__':
    main()
