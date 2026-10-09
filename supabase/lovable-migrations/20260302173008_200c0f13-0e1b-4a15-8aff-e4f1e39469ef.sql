
CREATE TABLE public.paydunya_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'ipn',
  withdrawal_request_id uuid REFERENCES public.withdrawal_requests(id),
  payload jsonb NOT NULL DEFAULT '{}',
  response_code text,
  status text,
  transaction_id text,
  amount integer,
  matched boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.paydunya_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON public.paydunya_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role can insert logs" ON public.paydunya_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.paydunya_logs;
