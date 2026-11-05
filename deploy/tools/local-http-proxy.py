"""Minimal HTTP/HTTPS (CONNECT) forward proxy bound to 127.0.0.1 only."""
import select, socket, sys, threading
from urllib.parse import urlsplit

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 18080

def pipe(a, b):
    socks = [a, b]
    try:
        while True:
            r, _, x = select.select(socks, [], socks, 120)
            if x or not r: return
            for s in r:
                data = s.recv(65536)
                if not data: return
                (b if s is a else a).sendall(data)
    finally:
        a.close(); b.close()

def handle(client):
    try:
        head = b""
        while b"\r\n\r\n" not in head:
            chunk = client.recv(65536)
            if not chunk: client.close(); return
            head += chunk
        line, rest = head.split(b"\r\n", 1)
        method, target, version = line.decode("latin-1").split(" ", 2)
        if method == "CONNECT":
            host, port = target.rsplit(":", 1)
            upstream = socket.create_connection((host, int(port)), timeout=30)
            client.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            body = head.split(b"\r\n\r\n", 1)[1]
            if body: upstream.sendall(body)
        else:
            u = urlsplit(target)
            upstream = socket.create_connection((u.hostname, u.port or 80), timeout=30)
            path = (u.path or "/") + (("?" + u.query) if u.query else "")
            headers = [h for h in rest.split(b"\r\n\r\n", 1)[0].split(b"\r\n") if h and not h.lower().startswith((b"proxy-", b"connection:"))]
            body = head.split(b"\r\n\r\n", 1)[1]
            upstream.sendall(f"{method} {path} {version}\r\n".encode() + b"\r\n".join(headers + [b"Connection: close"]) + b"\r\n\r\n" + body)
        upstream.settimeout(None); client.settimeout(None)
        pipe(client, upstream)
    except Exception:
        client.close()

srv = socket.socket(); srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("127.0.0.1", PORT)); srv.listen(128)
print(f"proxy listening on 127.0.0.1:{PORT}", flush=True)
while True:
    c, _ = srv.accept()
    threading.Thread(target=handle, args=(c,), daemon=True).start()
