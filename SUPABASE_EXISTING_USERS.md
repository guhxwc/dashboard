# Como Visualizar Seus Usuários Reais do Supabase

Se você já tem usuários cadastrados no seu projeto Supabase (na autenticação padrão), eles ficam numa tabela protegida chamada `auth.users` que o painel não consegue ler diretamente por segurança.

Para que o painel consiga listar esses usuários, você precisa criar uma "janela" (View) segura no seu banco de dados.

### Passo a Passo:

1.  Acesse o painel do seu Supabase.
2.  Vá em **SQL Editor** (ícone de terminal na esquerda).
3.  Cole o código abaixo e clique em **Run**:

```sql
-- 1. Cria uma visualização segura dos usuários
create or replace view public.admin_users_view as
select
  id,
  email,
  raw_user_meta_data->>'full_name' as name,
  raw_user_meta_data->>'name' as name_alt,
  created_at,
  last_sign_in_at
from auth.users;

-- 2. Permite que o painel leia essa visualização
grant select on public.admin_users_view to anon, authenticated, service_role;

-- 3. (Opcional) Se você tiver uma tabela 'profiles', garanta que ela também pode ser lida
-- grant select on public.profiles to anon, authenticated, service_role;
```

### O que isso faz?
Isso cria uma lista chamada `admin_users_view` que contém apenas o ID, Email, Nome e Data de Criação dos seus usuários. O painel agora vai conseguir ler essa lista e mostrar na tela "Base de Usuários".
