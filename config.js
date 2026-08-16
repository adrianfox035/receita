/*
============================================================
CONFIGURAÇÃO DO SUPABASE
============================================================

O site pede SOMENTE A SENHA na tela de admin.

O Supabase Auth, porém, exige um identificador junto da senha
(e-mail ou telefone). Por isso, o e-mail do administrador fica
somente nesta configuração e nunca é mostrado nem solicitado
ao usuário.

Use exatamente o mesmo e-mail da conta criada em:
Supabase > Authentication > Users

A senha dessa conta é:
314926

NUNCA coloque a service_role key aqui.
*/

window.SUPABASE_CONFIG = {
  url: "COLE_AQUI_A_URL_DO_SEU_PROJETO",
  anonKey: "COLE_AQUI_A_CHAVE_ANON_PUBLIC",

  // Uso interno pelo Supabase Auth. Não aparece na tela.
  adminEmail: "COLOQUE_AQUI_O_EMAIL_DA_CONTA_ADMIN"
};
