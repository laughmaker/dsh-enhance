#!/usr/bin/env python3
"""Dump the real sidebar workspace-row DOM via CDP (websocket, no deps)."""
import base64
import json
import os
import socket
import struct
import sys


def ws_connect(host, port, path):
    s = socket.create_connection((host, port), timeout=10)
    key = base64.b64encode(os.urandom(16)).decode()
    req = (
        f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\n"
        "Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        buf += s.recv(4096)
    return s


def ws_send(s, payload):
    data = payload.encode()
    header = bytearray([0x81])
    n = len(data)
    mask = os.urandom(4)
    if n < 126:
        header.append(0x80 | n)
    elif n < 65536:
        header.append(0x80 | 126)
        header += struct.pack(">H", n)
    else:
        header.append(0x80 | 127)
        header += struct.pack(">Q", n)
    header += mask
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    s.sendall(bytes(header) + masked)


def recv_exact(s, n):
    buf = b""
    while len(buf) < n:
        chunk = s.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("closed")
        buf += chunk
    return buf


def ws_recv(s):
    while True:
        b1, b2 = recv_exact(s, 2)
        opcode = b1 & 0x0F
        length = b2 & 0x7F
        if length == 126:
            length = struct.unpack(">H", recv_exact(s, 2))[0]
        elif length == 127:
            length = struct.unpack(">Q", recv_exact(s, 8))[0]
        payload = recv_exact(s, length)
        if opcode == 0x1:
            return payload.decode()
        if opcode == 0x8:
            raise ConnectionError("closed by peer")
        # ping/pong/continuation ignored


def evaluate(ws, expr):
    ws_send(ws, json.dumps({
        "id": 1, "method": "Runtime.evaluate",
        "params": {"expression": expr, "returnByValue": True, "awaitPromise": True},
    }))
    while True:
        msg = json.loads(ws_recv(ws))
        if msg.get("id") == 1:
            return msg


def main():
    expr = sys.argv[1] if len(sys.argv) > 1 else "document.body.innerHTML.length"
    ws = ws_connect("127.0.0.1", 9230, "/devtools/page/cdeaabc6-a697-420b-bf06-ff1d147fb09f")
    try:
        res = evaluate(ws, expr)
        val = res.get("result", {}).get("result", {})
        if "value" in val:
            print(val["value"] if isinstance(val["value"], str) else json.dumps(val["value"], ensure_ascii=False, indent=2))
        else:
            print(json.dumps(res, ensure_ascii=False)[:3000])
    finally:
        ws.close()


if __name__ == "__main__":
    main()
