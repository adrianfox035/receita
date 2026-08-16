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
  url: "https://hwhihebohjuwooeehivq.supabase.co",
  anonKey: "sb_publishable_CvZndoci7xeL9WJyKWtAGg_EOeilYFeC",

  // E-mail do usuário administrador criado em:
  // Supabase > Authentication > Users
  adminEmail: "adrian.fox035@gmail.com"
};
