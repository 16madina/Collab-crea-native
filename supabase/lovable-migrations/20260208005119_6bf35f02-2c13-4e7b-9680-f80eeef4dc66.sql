
-- Allow authenticated users to see creator roles (needed for marketplace)
CREATE POLICY "Anyone can view creator roles"
ON public.user_roles
FOR SELECT
USING (role = 'creator'::app_role);
