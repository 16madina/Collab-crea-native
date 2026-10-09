
-- Create storage bucket for social verification screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('social-screenshots', 'social-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for social screenshots
CREATE POLICY "Users can upload their own screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-screenshots' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Social verifications table
CREATE TABLE public.social_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'snapchat', 'facebook')),
  page_name TEXT NOT NULL,
  claimed_followers TEXT NOT NULL,
  screenshot_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_ai' CHECK (status IN ('pending_ai', 'verified', 'rejected', 'pending_admin')),
  ai_confidence NUMERIC(5,2),
  ai_extracted_name TEXT,
  ai_extracted_followers TEXT,
  ai_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own verifications"
ON public.social_verifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verifications"
ON public.social_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications"
ON public.social_verifications FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update verifications"
ON public.social_verifications FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_social_verifications_updated_at
BEFORE UPDATE ON public.social_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
