-- 1) Add super_admin to the role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
