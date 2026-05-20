
DELETE FROM public.client_temp_passwords WHERE client_id = 'e6ace195-5306-4170-a320-5f26201ab8cc';
DELETE FROM public.trainer_clients WHERE client_id = 'e6ace195-5306-4170-a320-5f26201ab8cc';
DELETE FROM public.user_roles WHERE user_id = 'e6ace195-5306-4170-a320-5f26201ab8cc';
DELETE FROM public.profiles WHERE id = 'e6ace195-5306-4170-a320-5f26201ab8cc';
DELETE FROM auth.users WHERE id = 'e6ace195-5306-4170-a320-5f26201ab8cc';
