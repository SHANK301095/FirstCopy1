-- Allow admins to view all profile private data (phone numbers)
CREATE POLICY "Admins can view all private profile data" 
ON public.profile_private_data 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));