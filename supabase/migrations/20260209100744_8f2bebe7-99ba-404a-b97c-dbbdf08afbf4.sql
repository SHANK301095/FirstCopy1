-- Enable realtime for profiles and waitlist so admin gets live notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sentinel_waitlist;