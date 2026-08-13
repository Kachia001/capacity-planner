DO $$
BEGIN
  EXECUTE format('ALTER ROLE %I SET timezone TO %L', current_user, 'UTC');
END
$$;
