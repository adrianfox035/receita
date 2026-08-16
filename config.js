/*
============================================================
CONFIGURAÇÃO DO SUPABASE
============================================================

1. Crie um projeto no Supabase.
2. Vá em Project Settings > API.
3. Cole aqui a Project URL e a chave anon/public.

4. Crie o administrador no Supabase:
   Authentication > Users > Add user

   E-mail:
   use o e-mail que você colocar abaixo

   Senha:
   314926

5. Depois de criar o usuário, copie o UUID dele.
6. No SQL Editor, execute o supabase.sql e coloque o UUID
   na linha indicada na seção ADMINISTRADOR.

IMPORTANTE:
- A chave anon/public pode estar no frontend.
- NUNCA coloque a service_role key neste arquivo.
- A senha NÃO fica armazenada neste JavaScript.
  O login é processado pelo Supabase Auth.
*/

window.SUPABASE_CONFIG = {
  url: "COLE_AQUI_A_URL_DO_SEU_PROJETO",
  anonKey: "COLE_AQUI_A_CHAVE_ANON_PUBLIC",

  // E-mail do usuário administrador criado em:
  // Supabase > Authentication > Users
  adminEmail: "SEU_EMAIL_ADMIN_AQUI"
};
