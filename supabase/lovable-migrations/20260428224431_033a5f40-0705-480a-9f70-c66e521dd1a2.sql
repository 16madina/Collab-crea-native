-- Atomic claim function: deactivates code on gate entry to prevent reuse
CREATE OR REPLACE FUNCTION public.claim_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
  v_updated INT;
BEGIN
  v_normalized := upper(trim(p_code));

  -- Atomic: deactivate the code if it's currently active and unused
  UPDATE invite_codes
  SET is_active = false
  WHERE code = v_normalized
    AND is_active = true
    AND used_by IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Update consume_invite_code to accept the now-inactive (but unused) code
-- so signup can finalize it with the user_id
CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_normalized TEXT;
  v_updated INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_normalized := upper(trim(p_code));

  -- Accept active OR claimed (inactive) codes, as long as not yet used by anyone
  UPDATE invite_codes
  SET used_by = v_user_id,
      used_at = now()
  WHERE code = v_normalized
    AND used_by IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;