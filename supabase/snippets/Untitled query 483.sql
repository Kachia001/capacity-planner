select id, user_id, session_id, revoked, created_at, updated_at
from auth.refresh_tokens
order by created_at desc;
