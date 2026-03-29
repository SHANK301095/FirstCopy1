-- Fix remaining RLS gaps

-- Prevent log tampering
CREATE POLICY "Users cannot update logs" 
ON public.logs 
FOR UPDATE 
USING (false);

-- Prevent activity tampering
CREATE POLICY "Activity cannot be updated" 
ON public.workspace_activity 
FOR UPDATE 
USING (false);

CREATE POLICY "Activity cannot be deleted" 
ON public.workspace_activity 
FOR DELETE 
USING (false);

-- Prevent invite manipulation (only via RPC)
CREATE POLICY "Invites cannot be updated directly" 
ON public.workspace_invites 
FOR UPDATE 
USING (false);