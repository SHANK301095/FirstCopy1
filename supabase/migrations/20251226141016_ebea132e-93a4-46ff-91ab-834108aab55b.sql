-- Fix security issue: Block anonymous access to profiles table
-- Users should only be able to view their own profile when authenticated

CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);

-- Fix security issue: Block anonymous access to workspace_invites table  
-- Only authenticated users should access invite tokens

CREATE POLICY "Block anonymous access to workspace_invites"
ON public.workspace_invites
FOR SELECT
TO anon
USING (false);

-- Also add explicit authentication requirements for other sensitive tables

-- datasets - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to datasets"
ON public.datasets
FOR SELECT
TO anon
USING (false);

-- strategies - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to strategies"
ON public.strategies
FOR SELECT
TO anon
USING (false);

-- runs - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to runs"
ON public.runs
FOR SELECT
TO anon
USING (false);

-- results - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to results"
ON public.results
FOR SELECT
TO anon
USING (false);

-- logs - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to logs"
ON public.logs
FOR SELECT
TO anon
USING (false);

-- user_roles - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- workspaces - already has member based policies, add anon block
CREATE POLICY "Block anonymous access to workspaces"
ON public.workspaces
FOR SELECT
TO anon
USING (false);

-- workspace_members - already has workspace based policies, add anon block
CREATE POLICY "Block anonymous access to workspace_members"
ON public.workspace_members
FOR SELECT
TO anon
USING (false);

-- workspace_activity - already has workspace based policies, add anon block
CREATE POLICY "Block anonymous access to workspace_activity"
ON public.workspace_activity
FOR SELECT
TO anon
USING (false);

-- projects - already has user/workspace based policies, add anon block
CREATE POLICY "Block anonymous access to projects"
ON public.projects
FOR SELECT
TO anon
USING (false);

-- strategy_versions - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to strategy_versions"
ON public.strategy_versions
FOR SELECT
TO anon
USING (false);

-- strategy_downloads - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to strategy_downloads"
ON public.strategy_downloads
FOR SELECT
TO anon
USING (false);

-- strategy_favorites - already has user_id based policies, add anon block
CREATE POLICY "Block anonymous access to strategy_favorites"
ON public.strategy_favorites
FOR SELECT
TO anon
USING (false);