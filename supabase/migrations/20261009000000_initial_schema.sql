-- Schéma complet de Collab Créa (état final des 67 migrations Lovable, rejouées puis consolidées).
SET check_function_bodies = false;
CREATE TYPE public.app_role AS ENUM (
    'creator',
    'brand',
    'admin'
);

CREATE FUNCTION public.can_initiate_contact(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.email_verified = true
    )
    AND (
      -- Brands: email verification is enough
      public.has_role(_user_id, 'brand'::public.app_role)
      OR (
        -- Creators/Admins: require identity verification too
        (public.has_role(_user_id, 'creator'::public.app_role) OR public.has_role(_user_id, 'admin'::public.app_role))
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.user_id = _user_id
            AND p.identity_verified = true
        )
      )
    );
$$;

CREATE FUNCTION public.claim_invite_code(p_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

CREATE FUNCTION public.consume_invite_code(p_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

CREATE FUNCTION public.expire_overdue_offers() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_offer record;
  v_brand_name text;
BEGIN
  -- Find active offers whose deadline has passed
  FOR v_offer IN
    SELECT o.id, o.title, o.brand_id
    FROM offers o
    WHERE o.status = 'active'
      AND o.deadline IS NOT NULL
      AND o.deadline < CURRENT_DATE
  LOOP
    -- Update status to expired
    UPDATE offers SET status = 'expired', updated_at = now()
    WHERE id = v_offer.id;

-- Create in-app notification for the brand
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_offer.brand_id,
      '⏰ Offre expirée',
      'Votre offre "' || v_offer.title || '" a expiré. Renouvelez-la ou supprimez-la depuis votre espace offres.',
      'info'
    );

-- Send push notification
    PERFORM public.send_push_notification(
      v_offer.brand_id,
      '⏰ Offre expirée',
      'Votre offre "' || v_offer.title || '" a expiré. Renouvelez-la pour continuer à recevoir des candidatures.',
      jsonb_build_object('route', '/brand/offers', 'offer_id', v_offer.id)
    );
  END LOOP;
END;
$$;

CREATE FUNCTION public.generate_invite_code(p_note text DEFAULT NULL::text) RETURNS TABLE(id uuid, code text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE FUNCTION public.is_conversation_participant(_conversation_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = auth.uid()
  )
$$;

CREATE FUNCTION public.is_user_verified(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND email_verified = true
      AND identity_verified = true
  )
$$;

CREATE FUNCTION public.send_push_notification(p_user_id uuid, p_title text, p_body text, p_data jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'net', 'vault'
    AS $$
DECLARE
  v_supabase_url text := 'https://qsbkwdtchhzclpxjrhnt.supabase.co';
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING 'send_push_notification: vault secret service_role_key not set';
    RETURN;
  END IF;

PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'data', p_data
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$$;

CREATE FUNCTION public.sync_application_status_on_collab_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

CASE NEW.status
    WHEN 'completed' THEN
      UPDATE applications SET status = 'accepted', updated_at = now()
      WHERE offer_id = NEW.offer_id AND creator_id = NEW.creator_id AND status = 'pending';
    WHEN 'in_progress' THEN
      UPDATE applications SET status = 'accepted', updated_at = now()
      WHERE offer_id = NEW.offer_id AND creator_id = NEW.creator_id AND status = 'pending';
    WHEN 'content_submitted' THEN
      UPDATE applications SET status = 'accepted', updated_at = now()
      WHERE offer_id = NEW.offer_id AND creator_id = NEW.creator_id AND status = 'pending';
    WHEN 'cancelled', 'refused', 'refunded' THEN
      UPDATE applications SET status = 'rejected', updated_at = now()
      WHERE offer_id = NEW.offer_id AND creator_id = NEW.creator_id AND status = 'pending';
    ELSE
      NULL;
  END CASE;

RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_notify_admins_on_block() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin record;
  v_blocker_name text;
  v_blocked_name text;
BEGIN
  -- Get blocker and blocked names
  SELECT full_name INTO v_blocker_name FROM profiles WHERE user_id = NEW.blocker_id;
  SELECT full_name INTO v_blocked_name FROM profiles WHERE user_id = NEW.blocked_id;

-- Notify ALL admins
  FOR v_admin IN
    SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_admin.user_id,
      '🚫 Utilisateur bloqué',
      COALESCE(v_blocker_name, 'Un utilisateur') || ' a bloqué ' || COALESCE(v_blocked_name, 'un utilisateur'),
      'warning'
    );
  END LOOP;

RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_push_on_application_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_offer_title text;
  v_brand_name text;
  v_notification_title text;
  v_notification_body text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get offer and brand info
  SELECT o.title, p.company_name INTO v_offer_title, v_brand_name
  FROM offers o
  JOIN profiles p ON p.user_id = o.brand_id
  WHERE o.id = NEW.offer_id;
  
  -- Determine notification based on new status
  CASE NEW.status
    WHEN 'accepted' THEN
      v_notification_title := '🎉 Candidature acceptée !';
      v_notification_body := 'Votre candidature pour "' || COALESCE(v_offer_title, 'Offre') || '" a été acceptée par ' || COALESCE(v_brand_name, 'la marque');
    WHEN 'rejected' THEN
      v_notification_title := '❌ Candidature refusée';
      v_notification_body := 'Votre candidature pour "' || COALESCE(v_offer_title, 'Offre') || '" n''a pas été retenue';
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Send push to creator
  PERFORM public.send_push_notification(
    NEW.creator_id,
    v_notification_title,
    v_notification_body,
    jsonb_build_object('route', '/collabs', 'application_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_push_on_collaboration_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_offer_title text;
  v_brand_name text;
  v_creator_name text;
  v_target_user_id uuid;
  v_notification_title text;
  v_notification_body text;
  v_route text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  SELECT o.title, pb.company_name, pc.full_name 
  INTO v_offer_title, v_brand_name, v_creator_name
  FROM offers o
  JOIN profiles pb ON pb.user_id = o.brand_id
  JOIN profiles pc ON pc.user_id = NEW.creator_id
  WHERE o.id = NEW.offer_id;
  
  CASE NEW.status
    WHEN 'accepted' THEN
      v_target_user_id := NEW.brand_id;
      v_notification_title := '✅ Collaboration acceptée !';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a accepté la collaboration pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'rejected' THEN
      v_target_user_id := NEW.brand_id;
      v_notification_title := '❌ Collaboration refusée';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a refusé la collaboration pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'content_submitted' THEN
      v_target_user_id := NEW.brand_id;
      v_notification_title := '📤 Contenu soumis !';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a soumis le contenu pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'revision_requested' THEN
      v_target_user_id := NEW.creator_id;
      v_notification_title := '🔄 Révision demandée';
      v_notification_body := COALESCE(v_brand_name, 'La marque') || ' demande des modifications pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/collabs';
      
    WHEN 'approved' THEN
      v_target_user_id := NEW.creator_id;
      v_notification_title := '🎉 Contenu approuvé !';
      v_notification_body := 'Votre contenu pour "' || COALESCE(v_offer_title, 'Offre') || '" a été approuvé ! Le paiement est en cours.';
      v_route := '/collabs';

WHEN 'pending_publication' THEN
      v_target_user_id := NEW.creator_id;
      v_notification_title := '📢 Publiez votre contenu !';
      v_notification_body := 'Votre aperçu pour "' || COALESCE(v_offer_title, 'Offre') || '" a été validé. Publiez-le sur vos réseaux et soumettez le lien.';
      v_route := '/collabs';

WHEN 'publication_submitted' THEN
      v_target_user_id := NEW.brand_id;
      v_notification_title := '🔗 Lien de publication soumis !';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a soumis le lien de publication pour "' || COALESCE(v_offer_title, 'Offre') || '". Vérifiez et confirmez.';
      v_route := '/brand/collabs';
      
    WHEN 'completed' THEN
      v_target_user_id := NEW.creator_id;
      v_notification_title := '💰 Paiement reçu !';
      v_notification_body := 'Votre paiement pour "' || COALESCE(v_offer_title, 'Offre') || '" a été crédité sur votre portefeuille.';
      v_route := '/creator/wallet';
      
    ELSE
      RETURN NEW;
  END CASE;
  
  -- In-app notification
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_target_user_id, v_notification_title, v_notification_body, 'info');

-- Push notification
  PERFORM public.send_push_notification(
    v_target_user_id,
    v_notification_title,
    v_notification_body,
    jsonb_build_object('route', v_route, 'collaboration_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_push_on_new_application() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_brand_id uuid;
  v_creator_name text;
  v_offer_title text;
BEGIN
  -- Get brand ID from offer
  SELECT o.brand_id, o.title INTO v_brand_id, v_offer_title
  FROM offers o
  WHERE o.id = NEW.offer_id;
  
  -- Get creator name
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.creator_id;
  
  -- Send push to brand
  PERFORM public.send_push_notification(
    v_brand_id,
    '📩 Nouvelle candidature',
    COALESCE(v_creator_name, 'Un créateur') || ' a postulé à votre offre "' || COALESCE(v_offer_title, 'Offre') || '"',
    jsonb_build_object('route', '/brand/collabs', 'application_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_push_on_new_collaboration() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_offer_title text;
  v_brand_name text;
BEGIN
  -- Get offer and brand info
  SELECT o.title, p.company_name INTO v_offer_title, v_brand_name
  FROM offers o
  JOIN profiles p ON p.user_id = o.brand_id
  WHERE o.id = NEW.offer_id;
  
  -- Send push to creator
  PERFORM public.send_push_notification(
    NEW.creator_id,
    '🤝 Nouvelle collaboration !',
    COALESCE(v_brand_name, 'Une marque') || ' vous propose une collaboration pour "' || COALESCE(v_offer_title, 'Offre') || '"',
    jsonb_build_object('route', '/collabs', 'collaboration_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.trigger_push_on_new_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name text;
  v_conversation_subject text;
BEGIN
  -- Get all participants except the sender
  FOR v_recipient_id IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
  LOOP
    -- Get sender name
    SELECT full_name INTO v_sender_name
    FROM profiles
    WHERE user_id = NEW.sender_id;
    
    -- Get conversation subject
    SELECT COALESCE(c.subject, 'Nouvelle conversation') INTO v_conversation_subject
    FROM conversations c
    WHERE c.id = NEW.conversation_id;
    
    -- Send push notification
    PERFORM public.send_push_notification(
      v_recipient_id,
      COALESCE(v_sender_name, 'Nouveau message'),
      LEFT(NEW.content, 100),
      jsonb_build_object('route', '/collabs', 'conversation_id', NEW.conversation_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_push_on_new_offer() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_creator record;
  v_brand_name text;
BEGIN
  -- Only trigger for published offers
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Get brand name
  SELECT company_name INTO v_brand_name
  FROM profiles
  WHERE user_id = NEW.brand_id;
  
  -- Notify ALL creators
  FOR v_creator IN
    SELECT p.user_id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role = 'creator'
      AND p.user_id != NEW.brand_id
  LOOP
    PERFORM public.send_push_notification(
      v_creator.user_id,
      '🆕 Nouvelle offre !',
      COALESCE(v_brand_name, 'Une marque') || ' recherche des créateurs : "' || NEW.title || '"',
      jsonb_build_object('route', '/creator/offers', 'offer_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_push_on_new_proposal() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_offer_title text;
  v_brand_name text;
  v_participant record;
BEGIN
  -- Only trigger if the conversation has an offer_id (it's a proposal)
  IF NEW.offer_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get offer and brand info
  SELECT o.title, p.company_name INTO v_offer_title, v_brand_name
  FROM offers o
  JOIN profiles p ON p.user_id = o.brand_id
  WHERE o.id = NEW.offer_id;
  
  -- Send push to all participants except the creator of the conversation
  FOR v_participant IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.id
      AND cp.user_id != NEW.created_by
  LOOP
    PERFORM public.send_push_notification(
      v_participant.user_id,
      '📩 Nouvelle proposition !',
      COALESCE(v_brand_name, 'Une marque') || ' vous propose une collaboration : "' || COALESCE(v_offer_title, 'Offre') || '"',
      jsonb_build_object('route', '/collabs', 'conversation_id', NEW.id, 'offer_id', NEW.offer_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_push_on_new_withdrawal_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin record;
  v_creator_name text;
  v_method_label text;
BEGIN
  -- Get creator name
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.user_id;

-- Determine method label
  IF NEW.method = 'mobile_money' THEN
    v_method_label := COALESCE(NEW.mobile_provider, 'Mobile Money');
  ELSE
    v_method_label := 'Virement bancaire';
  END IF;

-- Notify ALL admins
  FOR v_admin IN
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
  LOOP
    -- In-app notification
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_admin.user_id,
      '💸 Nouvelle demande de retrait',
      COALESCE(v_creator_name, 'Un créateur') || ' demande un retrait de ' || NEW.amount || ' FCFA via ' || v_method_label,
      'info'
    );

-- Push notification
    PERFORM public.send_push_notification(
      v_admin.user_id,
      '💸 Nouvelle demande de retrait',
      COALESCE(v_creator_name, 'Un créateur') || ' demande un retrait de ' || NEW.amount || ' FCFA via ' || v_method_label,
      jsonb_build_object('route', '/admin', 'tab', 'withdrawals')
    );
  END LOOP;

RETURN NEW;
END;
$$;

CREATE FUNCTION public.trigger_push_on_withdrawal_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_notification_title text;
  v_notification_body text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  CASE NEW.status
    WHEN 'approved' THEN
      v_notification_title := '💸 Retrait approuvé !';
      v_notification_body := 'Votre demande de retrait de ' || NEW.amount || ' FCFA a été approuvée.';
    WHEN 'completed' THEN
      v_notification_title := '✅ Retrait effectué !';
      v_notification_body := 'Votre retrait de ' || NEW.amount || ' FCFA a été envoyé.';
    WHEN 'rejected' THEN
      v_notification_title := '❌ Retrait refusé';
      v_notification_body := 'Votre demande de retrait a été refusée. ' || COALESCE(NEW.rejection_reason, '');
    ELSE
      RETURN NEW;
  END CASE;
  
  PERFORM public.send_push_notification(
    NEW.user_id,
    v_notification_title,
    v_notification_body,
    jsonb_build_object('route', '/creator/wallet')
  );
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.validate_invite_code(p_code text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM invite_codes
    WHERE code = upper(trim(p_code))
      AND is_active = true
      AND used_by IS NULL
  );
$$;

CREATE FUNCTION public.vault_upsert_service_role_key(p_value text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'vault'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'service_role_key';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(p_value, 'service_role_key');
  ELSE
    PERFORM vault.update_secret(v_id, p_value);
  END IF;
END;
$$;

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action_type text NOT NULL,
    target_user_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);

ALTER TABLE ONLY public.app_settings REPLICA IDENTITY FULL;

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    offer_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    conversation_id uuid,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    selected_slot jsonb
);

CREATE TABLE public.blocked_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.collaborations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    offer_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    brand_id uuid NOT NULL,
    conversation_id uuid,
    agreed_amount integer NOT NULL,
    platform_fee integer DEFAULT 0 NOT NULL,
    creator_amount integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending_payment'::text NOT NULL,
    deadline date NOT NULL,
    content_submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    auto_approve_at timestamp with time zone,
    content_url text,
    content_description text,
    brand_feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    publication_url text,
    preview_viewed_at timestamp with time zone,
    brand_assets text[] DEFAULT '{}'::text[]
);

ALTER TABLE ONLY public.collaborations REPLICA IDENTITY FULL;

COMMENT ON COLUMN public.collaborations.brand_assets IS 'Brand asset URLs (logos, photos) uploaded for the creator';

CREATE TABLE public.conversation_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    offer_id uuid,
    subject text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.conversations REPLICA IDENTITY FULL;

CREATE TABLE public.invite_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    created_by uuid NOT NULL,
    used_by uuid,
    used_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.legal_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    last_updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.messages REPLICA IDENTITY FULL;

CREATE TABLE public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;

CREATE TABLE public.offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    content_type text NOT NULL,
    budget_min integer DEFAULT 0 NOT NULL,
    budget_max integer DEFAULT 0 NOT NULL,
    deadline date,
    location text,
    logo_url text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    images text[] DEFAULT '{}'::text[],
    delivery_mode text DEFAULT 'private'::text NOT NULL,
    creative_brief jsonb DEFAULT '{}'::jsonb,
    presence_mode text DEFAULT 'remote'::text NOT NULL,
    filming_by text DEFAULT 'creator'::text NOT NULL,
    on_site_slots jsonb DEFAULT '[]'::jsonb,
    on_site_city text,
    on_site_neighborhood text,
    on_site_store_name text
);

COMMENT ON COLUMN public.offers.creative_brief IS 'Brand creative brief: phone, address, hashtags, mentions, guidelines';

COMMENT ON COLUMN public.offers.presence_mode IS 'remote or on_site';

COMMENT ON COLUMN public.offers.filming_by IS 'creator or brand - who films/produces the content';

COMMENT ON COLUMN public.offers.on_site_slots IS 'Array of {date, start_time, end_time} for on-site availability';

CREATE TABLE public.portfolio_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    media_type text NOT NULL,
    media_url text NOT NULL,
    thumbnail_url text,
    platform text,
    views_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT portfolio_items_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text])))
);

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    avatar_url text,
    bio text,
    category text,
    country text,
    followers text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    youtube_followers text,
    instagram_followers text,
    tiktok_followers text,
    snapchat_followers text,
    pricing jsonb DEFAULT '[]'::jsonb,
    email_verified boolean DEFAULT false,
    identity_verified boolean DEFAULT false,
    identity_document_url text,
    identity_submitted_at timestamp with time zone,
    company_name text,
    company_description text,
    sector text,
    website text,
    logo_url text,
    banner_url text,
    is_banned boolean DEFAULT false,
    ban_reason text,
    banned_at timestamp with time zone,
    residence_country text,
    selfie_url text,
    identity_method text,
    facebook_followers text
);

COMMENT ON COLUMN public.profiles.pricing IS 'Array of pricing items: [{type, price (in FCFA), description}]';

COMMENT ON COLUMN public.profiles.residence_country IS 'Country of residence (for dual-flag display). The existing country column stores the origin country for creators.';

CREATE TABLE public.push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text DEFAULT 'android'::text NOT NULL,
    device_info text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    report_type text NOT NULL,
    target_user_id uuid,
    target_offer_id uuid,
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_report_type_check CHECK ((report_type = ANY (ARRAY['user'::text, 'offer'::text, 'fraud'::text]))),
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'dismissed'::text])))
);

CREATE TABLE public.social_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    platform text NOT NULL,
    page_name text NOT NULL,
    claimed_followers text NOT NULL,
    screenshot_url text NOT NULL,
    status text DEFAULT 'pending_ai'::text NOT NULL,
    ai_confidence numeric(5,2),
    ai_extracted_name text,
    ai_extracted_followers text,
    ai_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT social_verifications_platform_check CHECK ((platform = ANY (ARRAY['youtube'::text, 'instagram'::text, 'tiktok'::text, 'snapchat'::text, 'facebook'::text]))),
    CONSTRAINT social_verifications_status_check CHECK ((status = ANY (ARRAY['pending_ai'::text, 'verified'::text, 'rejected'::text, 'pending_admin'::text])))
);

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collaboration_id uuid,
    wallet_id uuid,
    user_id uuid NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    amount integer NOT NULL,
    fee integer DEFAULT 0 NOT NULL,
    net_amount integer DEFAULT 0 NOT NULL,
    withdrawal_method text,
    withdrawal_details jsonb,
    description text,
    reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gateway_amount integer
);

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    pending_balance integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    amount integer NOT NULL,
    method text NOT NULL,
    bank_name text,
    account_number text,
    account_holder text,
    mobile_provider text,
    mobile_number text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    transaction_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    proof_url text,
    paypal_email text,
    payout_currency text DEFAULT 'XOF'::text
);

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_offer_id_creator_id_key UNIQUE (offer_id, creator_id);

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.collaborations
    ADD CONSTRAINT collaborations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invite_codes
    ADD CONSTRAINT invite_codes_code_key UNIQUE (code);

ALTER TABLE ONLY public.invite_codes
    ADD CONSTRAINT invite_codes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.legal_pages
    ADD CONSTRAINT legal_pages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.legal_pages
    ADD CONSTRAINT legal_pages_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_token_key UNIQUE (user_id, token);

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.social_verifications
    ADD CONSTRAINT social_verifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);

CREATE INDEX idx_applications_creator_id ON public.applications USING btree (creator_id);

CREATE INDEX idx_applications_offer_id ON public.applications USING btree (offer_id);

CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants USING btree (user_id);

CREATE INDEX idx_invite_codes_code ON public.invite_codes USING btree (code);

CREATE INDEX idx_invite_codes_used_by ON public.invite_codes USING btree (used_by);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);

CREATE INDEX idx_offers_brand_id ON public.offers USING btree (brand_id);

CREATE INDEX idx_offers_status ON public.offers USING btree (status);

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX transactions_reference_unique_idx ON public.transactions USING btree (reference) WHERE (reference IS NOT NULL);

CREATE TRIGGER on_new_proposal AFTER INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_new_proposal();

CREATE TRIGGER on_new_withdrawal_request AFTER INSERT ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_new_withdrawal_request();

CREATE TRIGGER on_user_blocked AFTER INSERT ON public.blocked_users FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_admins_on_block();

CREATE TRIGGER trg_sync_application_on_collab_change AFTER UPDATE ON public.collaborations FOR EACH ROW EXECUTE FUNCTION public.sync_application_status_on_collab_change();

CREATE TRIGGER trigger_push_application_status AFTER UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_application_status_change();

CREATE TRIGGER trigger_push_collaboration_status AFTER UPDATE ON public.collaborations FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_collaboration_status_change();

CREATE TRIGGER trigger_push_new_application AFTER INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_new_application();

CREATE TRIGGER trigger_push_new_collaboration AFTER INSERT ON public.collaborations FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_new_collaboration();

CREATE TRIGGER trigger_push_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_new_message();

CREATE TRIGGER trigger_push_new_offer AFTER INSERT ON public.offers FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_new_offer();

CREATE TRIGGER trigger_push_withdrawal_status AFTER UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.trigger_push_on_withdrawal_status_change();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON public.collaborations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_pages_updated_at BEFORE UPDATE ON public.legal_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON public.push_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_verifications_updated_at BEFORE UPDATE ON public.social_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.collaborations
    ADD CONSTRAINT collaborations_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);

ALTER TABLE ONLY public.collaborations
    ADD CONSTRAINT collaborations_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id);

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_collaboration_id_fkey FOREIGN KEY (collaboration_id) REFERENCES public.collaborations(id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);

CREATE POLICY "Active offers are viewable by everyone" ON public.offers FOR SELECT USING (((status = 'active'::text) OR (auth.uid() = brand_id)));

CREATE POLICY "Admins can create invite codes" ON public.invite_codes FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (created_by = auth.uid())));

CREATE POLICY "Admins can delete invite codes" ON public.invite_codes FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert app settings" ON public.app_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert legal pages" ON public.legal_pages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert logs" ON public.admin_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage all notifications" ON public.notifications USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage templates" ON public.notification_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update app settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update invite codes" ON public.invite_codes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update legal pages" ON public.legal_pages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update verifications" ON public.social_verifications FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));

CREATE POLICY "Admins can update wallets" ON public.wallets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update withdrawal requests" ON public.withdrawal_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all invite codes" ON public.invite_codes FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all tokens" ON public.push_tokens FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all verifications" ON public.social_verifications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));

CREATE POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view logs" ON public.admin_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Anyone can read legal pages" ON public.legal_pages FOR SELECT USING (true);

CREATE POLICY "Anyone can view creator roles" ON public.user_roles FOR SELECT USING ((role = 'creator'::public.app_role));

CREATE POLICY "Anyone can view templates" ON public.notification_templates FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = created_by));

CREATE POLICY "Brands can create collaborations" ON public.collaborations FOR INSERT WITH CHECK ((auth.uid() = brand_id));

CREATE POLICY "Brands can create their own offers" ON public.offers FOR INSERT TO authenticated WITH CHECK ((auth.uid() = brand_id));

CREATE POLICY "Brands can delete their own offers" ON public.offers FOR DELETE USING ((auth.uid() = brand_id));

CREATE POLICY "Brands can update their collaborations" ON public.collaborations FOR UPDATE USING ((auth.uid() = brand_id));

CREATE POLICY "Brands can update their own offers" ON public.offers FOR UPDATE TO authenticated USING ((auth.uid() = brand_id));

CREATE POLICY "Brands can view their collaborations" ON public.collaborations FOR SELECT USING ((auth.uid() = brand_id));

CREATE POLICY "Conversation creator can add participants" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = conversation_participants.conversation_id) AND (c.created_by = auth.uid())))) OR (user_id = auth.uid())));

CREATE POLICY "Creators and offer owners can update applications" ON public.applications FOR UPDATE TO authenticated USING (((auth.uid() = creator_id) OR (EXISTS ( SELECT 1
   FROM public.offers o
  WHERE ((o.id = applications.offer_id) AND (o.brand_id = auth.uid()))))));

CREATE POLICY "Creators and offer owners can view applications" ON public.applications FOR SELECT USING (((auth.uid() = creator_id) OR (EXISTS ( SELECT 1
   FROM public.offers o
  WHERE ((o.id = applications.offer_id) AND (o.brand_id = auth.uid()))))));

CREATE POLICY "Creators can apply to offers" ON public.applications FOR INSERT WITH CHECK (((auth.uid() = creator_id) AND public.is_user_verified(auth.uid())));

CREATE POLICY "Creators can create collaborations" ON public.collaborations FOR INSERT WITH CHECK ((auth.uid() = creator_id));

CREATE POLICY "Creators can update their collaborations" ON public.collaborations FOR UPDATE USING ((auth.uid() = creator_id));

CREATE POLICY "Creators can view their collaborations" ON public.collaborations FOR SELECT USING ((auth.uid() = creator_id));

CREATE POLICY "Participants can mark messages as read" ON public.messages FOR UPDATE USING (public.is_conversation_participant(conversation_id)) WITH CHECK (public.is_conversation_participant(conversation_id));

CREATE POLICY "Portfolio items are viewable by everyone" ON public.portfolio_items FOR SELECT USING (true);

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can block others" ON public.blocked_users FOR INSERT TO authenticated WITH CHECK ((blocker_id = auth.uid()));

CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));

CREATE POLICY "Users can create their own portfolio items" ON public.portfolio_items FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can create their own verifications" ON public.social_verifications FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can create their own wallet" ON public.wallets FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete their own portfolio items" ON public.portfolio_items FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "Users can delete their own tokens" ON public.push_tokens FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own tokens" ON public.push_tokens FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can self-assign non-admin role on signup" ON public.user_roles FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (role = ANY (ARRAY['creator'::public.app_role, 'brand'::public.app_role]))));

CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT TO authenticated WITH CHECK ((public.is_conversation_participant(conversation_id) AND (auth.uid() = sender_id)));

CREATE POLICY "Users can unblock" ON public.blocked_users FOR DELETE TO authenticated USING ((blocker_id = auth.uid()));

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Users can update their own portfolio items" ON public.portfolio_items FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Users can update their own tokens" ON public.push_tokens FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Users can view conversations they participate in" ON public.conversations FOR SELECT USING ((public.is_conversation_participant(id) OR (created_by = auth.uid())));

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants FOR SELECT USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "Users can view their own blocks" ON public.blocked_users FOR SELECT TO authenticated USING ((blocker_id = auth.uid()));

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING ((auth.uid() = reporter_id));

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own tokens" ON public.push_tokens FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own verifications" ON public.social_verifications FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their transactions" ON public.transactions FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their withdrawal requests" ON public.withdrawal_requests FOR SELECT USING ((auth.uid() = user_id));

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.social_verifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Stockage et temps réel
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('identity-documents','identity-documents','f',NULL,NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('email-assets','email-assets','t',NULL,NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('avatars','avatars','t',NULL,NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('portfolio','portfolio','t',NULL,NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('offer-images','offer-images','t',NULL,NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('collaboration-content','collaboration-content','t',NULL,NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('selfies','selfies','f',NULL,NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('social-screenshots','social-screenshots','f',NULL,NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('withdrawal-proofs','withdrawal-proofs','f',NULL,NULL) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users can upload their own identity document" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'identity-documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can view their own identity document" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'identity-documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can update their own identity document" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'identity-documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Email assets are publicly accessible" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'email-assets'::text));
CREATE POLICY "Anyone can view avatars" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));
CREATE POLICY "Users can upload their own avatar" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can update their own avatar" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can delete their own avatar" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Portfolio files are publicly accessible" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'portfolio'::text));
CREATE POLICY "Users can upload to their own portfolio folder" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'portfolio'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can update their own portfolio files" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'portfolio'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can delete their own portfolio files" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'portfolio'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Offer images are publicly accessible" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'offer-images'::text));
CREATE POLICY "Users can delete their own offer images" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'offer-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Public read access to collaboration content" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'collaboration-content'::text));
CREATE POLICY "Users can upload their own selfie" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'selfies'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can view their own selfie" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'selfies'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can update their own selfie" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'selfies'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Admins can view all selfies" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'selfies'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can upload their own screenshots" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'social-screenshots'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can view their own screenshots" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'social-screenshots'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Admins can view all screenshots" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'social-screenshots'::text) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role))))));
CREATE POLICY "Admins can upload proofs" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'withdrawal-proofs'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can view proofs" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'withdrawal-proofs'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view their own withdrawal proofs" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'withdrawal-proofs'::text) AND (EXISTS ( SELECT 1
   FROM withdrawal_requests wr
  WHERE ((wr.proof_url ~~ ('%'::text || objects.name)) AND (wr.user_id = auth.uid()))))));
CREATE POLICY "Admins can view all identity documents" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'identity-documents'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Owners can update their collaboration content" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'collaboration-content'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Owners can delete their collaboration content" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'collaboration-content'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Owners can upload their collaboration content" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'collaboration-content'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Brands can upload offer images to their own folder" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'offer-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Brands can update their own offer images" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'offer-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
-- Données initiales
INSERT INTO public.app_settings VALUES ('invite_codes_required', 'false', '2026-10-09 21:14:10.04+00', NULL);
INSERT INTO public.legal_pages VALUES ('4114f2e5-b332-434e-94db-a6674ff6ef9c', 'terms', 'Conditions Générales d''Utilisation', '## 1. Acceptation des conditions
En accédant et en utilisant CollabCrea, vous acceptez d''être lié par ces Conditions Générales d''Utilisation. Si vous n''acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.
## 2. Description du service
CollabCrea est une plateforme de mise en relation entre créateurs de contenu et marques en Afrique. Notre service permet aux créateurs de présenter leur profil et aux marques de proposer des collaborations.
## 3. Inscription et compte
Pour utiliser certaines fonctionnalités de CollabCrea, vous devez créer un compte. Vous êtes responsable de :
- Fournir des informations exactes et à jour
- Maintenir la confidentialité de vos identifiants de connexion
- Toutes les activités effectuées sous votre compte
## 4. Utilisation acceptable
Vous vous engagez à ne pas :
- Utiliser la plateforme à des fins illégales
- Publier du contenu faux, trompeur ou diffamatoire
- Harceler ou intimider d''autres utilisateurs
- Tenter de compromettre la sécurité de la plateforme
- Créer plusieurs comptes ou usurper l''identité d''autrui
## 5. Propriété intellectuelle
Vous conservez tous les droits sur le contenu que vous publiez. En publiant du contenu sur CollabCrea, vous nous accordez une licence non exclusive pour afficher ce contenu sur la plateforme.
## 6. Intégrations tierces
CollabCrea peut se connecter à des services tiers (TikTok, YouTube, Instagram, etc.) pour vérifier vos statistiques. Ces connexions sont soumises aux conditions d''utilisation de ces services respectifs.
## 7. Limitation de responsabilité
CollabCrea agit uniquement comme intermédiaire. Nous ne sommes pas responsables des accords conclus entre créateurs et marques, ni des litiges pouvant en découler.
## 8. Modifications
Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication sur cette page.
## 9. Contact
Pour toute question concernant ces conditions, veuillez nous contacter via la page Contact.', NULL, '2026-10-09 21:14:09.988+00', '2026-10-09 21:14:09.988+00');
INSERT INTO public.legal_pages VALUES ('cc12eafa-56b0-4d4f-a894-c3cf94d8eff2', 'privacy', 'Politique de Confidentialité', '## 1. Introduction
Chez CollabCrea, nous prenons la protection de vos données personnelles très au sérieux. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.
## 2. Données collectées
Nous collectons les types de données suivants :
- **Informations de compte :** nom, email, numéro de téléphone, pays
- **Informations de profil :** photo, biographie, catégorie, tarifs
- **Données des réseaux sociaux :** nombre d''abonnés (via OAuth avec votre consentement)
- **Documents d''identité :** pour la vérification des créateurs
- **Données d''utilisation :** interactions avec la plateforme
## 3. Utilisation des données
Vos données sont utilisées pour :
- Fournir et améliorer nos services
- Vérifier l''authenticité des profils créateurs
- Faciliter les mises en relation avec les marques
- Communiquer avec vous concernant votre compte
- Assurer la sécurité de la plateforme
## 4. Intégrations tierces
Lorsque vous connectez vos comptes TikTok, YouTube ou autres réseaux sociaux, nous accédons uniquement aux statistiques publiques (nombre d''abonnés) nécessaires pour vérifier votre profil. Nous ne publions jamais en votre nom et ne stockons pas vos identifiants de connexion.
## 5. Partage des données
Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations avec :
- Les marques avec lesquelles vous choisissez de collaborer
- Nos prestataires techniques (hébergement, analyse)
- Les autorités si requis par la loi
## 6. Sécurité
Nous utilisons des mesures de sécurité conformes aux standards de l''industrie pour protéger vos données, incluant le chiffrement, l''authentification sécurisée et des audits réguliers.
## 7. Vos droits
Conformément aux lois applicables, vous avez le droit de :
- Accéder à vos données personnelles
- Rectifier vos informations
- Supprimer votre compte et vos données
- Retirer votre consentement aux intégrations tierces
- Exporter vos données
## 8. Conservation des données
Nous conservons vos données tant que votre compte est actif. Après suppression de votre compte, vos données sont effacées dans un délai de 30 jours, sauf obligation légale de conservation.
## 9. Cookies
Nous utilisons des cookies essentiels pour le fonctionnement de la plateforme et des cookies d''analyse pour améliorer nos services. Vous pouvez gérer vos préférences dans les paramètres de votre navigateur.
## 10. Contact
Pour exercer vos droits ou poser des questions sur cette politique, contactez-nous via la page Contact.', NULL, '2026-10-09 21:14:09.988+00', '2026-10-09 21:14:09.988+00');
INSERT INTO public.notification_templates VALUES ('659d8d95-c29e-4a57-b245-615df9f86ae2', 'promotion', 'Nouvelle promotion !', 'Découvrez nos nouvelles offres exclusives sur Collab''Créa !', 'promotion', '2026-10-09 21:14:09.931+00', '2026-10-09 21:14:09.931+00');
INSERT INTO public.notification_templates VALUES ('056eb4b9-377f-4cab-81e9-45832d4542b4', 'warning', 'Avertissement', 'Votre compte a reçu un avertissement. Veuillez respecter nos conditions d''utilisation.', 'warning', '2026-10-09 21:14:09.931+00', '2026-10-09 21:14:09.931+00');
INSERT INTO public.notification_templates VALUES ('3d54040b-3013-4d72-8de1-408cc52401e3', 'welcome', 'Bienvenue !', 'Bienvenue sur Collab''Créa ! Complétez votre profil pour commencer.', 'info', '2026-10-09 21:14:09.931+00', '2026-10-09 21:14:09.931+00');
INSERT INTO public.notification_templates VALUES ('8bd991dd-b4f2-4e87-af1f-21da43a8cec1', 'verification_approved', 'Identité vérifiée', 'Félicitations ! Votre identité a été vérifiée avec succès.', 'success', '2026-10-09 21:14:09.931+00', '2026-10-09 21:14:09.931+00');
INSERT INTO public.notification_templates VALUES ('463c14e7-eafb-417f-80ba-4c5884e7a1e2', 'verification_rejected', 'Vérification refusée', 'Votre document d''identité n''a pas pu être vérifié. Veuillez soumettre un nouveau document.', 'error', '2026-10-09 21:14:09.931+00', '2026-10-09 21:14:09.931+00');
