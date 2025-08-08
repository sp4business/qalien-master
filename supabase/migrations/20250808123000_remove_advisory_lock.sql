-- Remove advisory lock functions; replaced by dequeue-if-idle approach
DROP FUNCTION IF EXISTS public.acquire_ai_worker_lock() CASCADE;
DROP FUNCTION IF EXISTS public.release_ai_worker_lock() CASCADE;