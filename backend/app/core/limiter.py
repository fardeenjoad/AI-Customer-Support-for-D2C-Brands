import os
import sys
from slowapi import Limiter
from slowapi.util import get_remote_address

# Disable rate limiting when running under pytest
is_testing = "pytest" in sys.modules or "pytest" in os.environ.get("PYTEST_CURRENT_TEST", "")

limiter = Limiter(key_func=get_remote_address, enabled=not is_testing)

