ALTER TABLE public.profiles ADD COLUMN security_question text;
ALTER TABLE public.profiles ADD COLUMN security_answer_hash text;
COMMENT ON COLUMN public.profiles.security_answer_hash IS 'SHA-256 hash of the normalized (trimmed, lowercased) security answer; plaintext is never stored.';