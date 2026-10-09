
DROP POLICY "Service role can insert logs" ON public.paydunya_logs;

CREATE POLICY "Admins can insert logs" ON public.paydunya_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service can insert logs" ON public.paydunya_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
