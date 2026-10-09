
-- ============================================
-- TABLE: app_settings (toggle admin)
-- ============================================
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert app settings"
ON public.app_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update app settings"
ON public.app_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Default: invite system disabled
INSERT INTO public.app_settings (key, value)
VALUES ('invite_codes_required', 'false'::jsonb);

-- ============================================
-- TABLE: invite_codes
-- ============================================
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  used_by UUID,
  used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX idx_invite_codes_used_by ON public.invite_codes(used_by);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage codes
CREATE POLICY "Admins can view all invite codes"
ON public.invite_codes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create invite codes"
ON public.invite_codes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins can update invite codes"
ON public.invite_codes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invite codes"
ON public.invite_codes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- FUNCTION: generate_invite_code (admin only)
-- Generates a unique COLLAB-XXXX code
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_invite_code(p_note TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_id UUID;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no I,O,0,1 (confusing)
  v_attempts INT := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can generate invite codes';
  END IF;

  LOOP
    v_code := 'COLLAB-' ||
      substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1) ||
      substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1) ||
      substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1) ||
      substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);

    BEGIN
      INSERT INTO invite_codes (code, created_by, note)
      VALUES (v_code, auth.uid(), p_note)
      RETURNING invite_codes.id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate a unique code after 10 attempts';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_id, v_code;
END;
$$;

-- ============================================
-- FUNCTION: consume_invite_code
-- Atomically validates + marks code as used during signup
-- Called by the authenticated user right after signup
-- ============================================
CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code TEXT)
RETURNS BOOLEAN
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

  -- Atomic claim: only succeeds if code is active and not used
  UPDATE invite_codes
  SET used_by = v_user_id,
      used_at = now()
  WHERE code = v_normalized
    AND is_active = true
    AND used_by IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- ============================================
-- FUNCTION: validate_invite_code (read-only check)
-- Used during signup form to validate before submission
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM invite_codes
    WHERE code = upper(trim(p_code))
      AND is_active = true
      AND used_by IS NULL
  );
$$;

-- ============================================
-- TRIGGER: updated_at on app_settings
-- ============================================
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
