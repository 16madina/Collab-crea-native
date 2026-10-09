-- Add is_banned column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_reason text,
ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone;

-- Create notifications table for push notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Create predefined notification templates
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create admin action logs
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notification_templates
CREATE POLICY "Anyone can view templates"
ON public.notification_templates FOR SELECT
USING (true);

CREATE POLICY "Admins can manage templates"
ON public.notification_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admin_logs
CREATE POLICY "Admins can view logs"
ON public.admin_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs"
ON public.admin_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default notification templates
INSERT INTO public.notification_templates (name, title, message, type) VALUES
('promotion', 'Nouvelle promotion !', 'Découvrez nos nouvelles offres exclusives sur Collab''Créa !', 'promotion'),
('warning', 'Avertissement', 'Votre compte a reçu un avertissement. Veuillez respecter nos conditions d''utilisation.', 'warning'),
('welcome', 'Bienvenue !', 'Bienvenue sur Collab''Créa ! Complétez votre profil pour commencer.', 'info'),
('verification_approved', 'Identité vérifiée', 'Félicitations ! Votre identité a été vérifiée avec succès.', 'success'),
('verification_rejected', 'Vérification refusée', 'Votre document d''identité n''a pas pu être vérifié. Veuillez soumettre un nouveau document.', 'error');

-- Create trigger for updated_at on notification_templates
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add policy for admins to view all profiles (needed for admin panel)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));