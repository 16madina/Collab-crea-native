ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS paypal_email TEXT,
ADD COLUMN IF NOT EXISTS payout_currency TEXT DEFAULT 'XOF';