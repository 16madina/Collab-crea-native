ALTER TABLE public.withdrawal_requests 
  DROP CONSTRAINT IF EXISTS withdrawal_requests_transaction_id_fkey;

ALTER TABLE public.withdrawal_requests 
  ALTER COLUMN transaction_id TYPE text USING transaction_id::text;