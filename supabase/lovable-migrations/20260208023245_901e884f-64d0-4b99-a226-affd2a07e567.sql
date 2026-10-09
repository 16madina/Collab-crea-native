-- Create wallets table for creators
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  pending_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collaborations table to track accepted offers
CREATE TABLE public.collaborations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id),
  creator_id UUID NOT NULL,
  brand_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id),
  
  -- Pricing
  agreed_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  creator_amount INTEGER NOT NULL DEFAULT 0,
  
  -- Status: pending_payment, in_progress, content_submitted, approved, completed, cancelled, refunded, expired
  status TEXT NOT NULL DEFAULT 'pending_payment',
  
  -- Deadlines
  deadline DATE NOT NULL,
  content_submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  auto_approve_at TIMESTAMP WITH TIME ZONE,
  
  -- Content
  content_url TEXT,
  content_description TEXT,
  
  -- Review
  brand_feedback TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- References
  collaboration_id UUID REFERENCES public.collaborations(id),
  wallet_id UUID REFERENCES public.wallets(id),
  user_id UUID NOT NULL,
  
  -- Type: escrow, release, refund, withdrawal, deposit
  type TEXT NOT NULL,
  
  -- Status: pending, completed, failed, cancelled
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Amounts
  amount INTEGER NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL DEFAULT 0,
  
  -- For withdrawals
  withdrawal_method TEXT, -- bank, mobile_money
  withdrawal_details JSONB,
  
  -- Metadata
  description TEXT,
  reference TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  
  amount INTEGER NOT NULL,
  method TEXT NOT NULL, -- bank, mobile_money
  
  -- Bank details
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  
  -- Mobile money details
  mobile_provider TEXT, -- orange, mtn, wave
  mobile_number TEXT,
  
  -- Status: pending, processing, completed, rejected
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Admin review
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  transaction_id UUID REFERENCES public.transactions(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view their own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet"
ON public.wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update wallets"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

-- Collaborations policies
CREATE POLICY "Creators can view their collaborations"
ON public.collaborations FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Brands can view their collaborations"
ON public.collaborations FOR SELECT
USING (auth.uid() = brand_id);

CREATE POLICY "Brands can create collaborations"
ON public.collaborations FOR INSERT
WITH CHECK (auth.uid() = brand_id);

CREATE POLICY "Creators can update their collaborations"
ON public.collaborations FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Brands can update their collaborations"
ON public.collaborations FOR UPDATE
USING (auth.uid() = brand_id);

-- Transactions policies
CREATE POLICY "Users can view their transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Withdrawal requests policies
CREATE POLICY "Users can view their withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborations_updated_at
BEFORE UPDATE ON public.collaborations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();