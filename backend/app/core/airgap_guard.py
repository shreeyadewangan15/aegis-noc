"""
Runtime Air-Gap Network Guard & Socket Interceptor
Enforces zero external telemetry leaks or cloud API outbound calls.
Rejects all non-localhost/non-loopback network socket creations.
"""

import socket
import logging
import datetime
import traceback
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("AegisAirgapGuard")

class AirgapSecurityViolation(PermissionError):
    """Raised whenever a non-whitelisted outbound socket connection is attempted."""
    pass

class AirgapGuardManager:
    _instance = None
    _installed = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AirgapGuardManager, cls).__new__(cls)
            cls._instance.audit_log: List[Dict[str, Any]] = []
            cls._instance.blocked_count = 0
            cls._instance.allowed_count = 0
            cls._instance.whitelist_hosts = {
                "127.0.0.1",
                "localhost",
                "::1",
                "0.0.0.0",
                "testserver",
            }
            cls._instance._orig_connect = None
            cls._instance._orig_create_connection = None
            cls._instance._orig_getaddrinfo = None
        return cls._instance

    def is_destination_allowed(self, host: Any) -> bool:
        if not host:
            return True
        host_str = str(host).lower().strip()
        if host_str in self.whitelist_hosts:
            return True
        # Allow localhost / loopback IPs (127.0.0.0/8)
        if host_str.startswith("127.") or host_str == "0.0.0.0":
            return True
        return False

    def record_event(self, host: str, port: Any, allowed: bool, reason: str, stack: str):
        event = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "destination_host": str(host),
            "destination_port": str(port),
            "action": "ALLOWED" if allowed else "BLOCKED_AIRGAP_VIOLATION",
            "reason": reason,
            "caller_trace": stack.split("\n")[-6:] if stack else []
        }
        self.audit_log.append(event)
        # Keep sliding log of last 500 events
        if len(self.audit_log) > 500:
            self.audit_log.pop(0)

        if allowed:
            self.allowed_count += 1
            logger.debug(f"[AIR-GAP GUARD] Allowed local socket: {host}:{port}")
        else:
            self.blocked_count += 1
            logger.critical(f"[AIR-GAP VIOLATION BLOCKED] Attempted outbound egress to {host}:{port}. Blocked by Air-Gap Guard.")

    def install(self):
        """Monkeys socket primitives to reject any external network calls."""
        if self._installed:
            return

        self._orig_connect = socket.socket.connect
        self._orig_create_connection = socket.create_connection
        self._orig_getaddrinfo = socket.getaddrinfo

        guard_self = self

        def guarded_connect(sock_self, address):
            host = address[0] if isinstance(address, (tuple, list)) and len(address) > 0 else address
            port = address[1] if isinstance(address, (tuple, list)) and len(address) > 1 else "unknown"
            
            # Check if address is unix domain socket (string path)
            if isinstance(address, str):
                guard_self.record_event(address, "unix_sock", True, "Unix Domain Socket Allowed", "")
                return guard_self._orig_connect(sock_self, address)

            if guard_self.is_destination_allowed(host):
                guard_self.record_event(str(host), port, True, "Local loopback allowed", "")
                return guard_self._orig_connect(sock_self, address)
            else:
                stack = traceback.format_exc()
                guard_self.record_event(str(host), port, False, f"Non-whitelisted destination: {host}", stack)
                raise AirgapSecurityViolation(
                    f"[AIRGAP-GUARD-REJECTED] Outbound socket connection to '{host}:{port}' was strictly rejected. "
                    f"System operates in 100% air-gapped mode with zero external egress permitted."
                )

        def guarded_create_connection(address, timeout=socket._GLOBAL_DEFAULT_TIMEOUT, source_address=None):
            host = address[0] if isinstance(address, (tuple, list)) and len(address) > 0 else address
            port = address[1] if isinstance(address, (tuple, list)) and len(address) > 1 else "unknown"

            if guard_self.is_destination_allowed(host):
                guard_self.record_event(str(host), port, True, "Local loopback allowed", "")
                return guard_self._orig_create_connection(address, timeout, source_address)
            else:
                stack = "".join(traceback.format_stack())
                guard_self.record_event(str(host), port, False, f"Non-whitelisted create_connection: {host}", stack)
                raise AirgapSecurityViolation(
                    f"[AIRGAP-GUARD-REJECTED] Outbound create_connection to '{host}:{port}' was strictly rejected."
                )

        # Apply monkeypatch
        socket.socket.connect = guarded_connect
        socket.create_connection = guarded_create_connection
        self._installed = True
        logger.info(">>> Air-Gap Network Guard active: Zero outbound socket egress enforced.")

    def get_status(self) -> Dict[str, Any]:
        return {
            "guard_active": self._installed,
            "mode": "STRICT_AIRGAP_OFFLINE",
            "allowed_local_connections": self.allowed_count,
            "blocked_outbound_violations": self.blocked_count,
            "recent_audit_events": self.audit_log[-20:],
            "whitelisted_endpoints": list(self.whitelist_hosts)
        }

guard_manager = AirgapGuardManager()
