"""
Compatibility exports for older imports.

Authentication and role checks live in app.core.security and
app.core.dependencies so JWT settings are loaded from one source.
"""

from app.core.dependencies import (  # noqa: F401
    RoleChecker,
    get_current_user,
    require_admin,
    require_admin_or_agent,
    require_agent,
    require_customer,
)
from app.core.security import (  # noqa: F401
    create_access_token,
    get_password_hash,
    verify_password,
)
