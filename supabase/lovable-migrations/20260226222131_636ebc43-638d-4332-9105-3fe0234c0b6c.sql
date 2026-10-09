
-- Trigger: auto-update application status when collaboration status changes
CREATE OR REPLACE FUNCTION public.sync_application_status_on_collab_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER trg_sync_application_on_collab_change
  AFTER UPDATE ON collaborations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_application_status_on_collab_change();

-- Fix existing stale applications
UPDATE applications a
SET status = 'accepted', updated_at = now()
WHERE a.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM collaborations c
    WHERE c.offer_id = a.offer_id AND c.creator_id = a.creator_id
    AND c.status IN ('completed', 'in_progress', 'content_submitted', 'approved', 'pending_publication', 'publication_submitted')
  );

UPDATE applications a
SET status = 'rejected', updated_at = now()
WHERE a.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM collaborations c
    WHERE c.offer_id = a.offer_id AND c.creator_id = a.creator_id
    AND c.status NOT IN ('cancelled', 'refused', 'refunded')
  )
  AND EXISTS (
    SELECT 1 FROM collaborations c
    WHERE c.offer_id = a.offer_id AND c.creator_id = a.creator_id
  );
