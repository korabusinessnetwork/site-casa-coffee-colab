-- =============================================================================
-- Casa Coffee Colab — scripts/check-migrations.sql
--
-- "Quais migrations já estão no banco?" — as migrations são aplicadas à mão no
-- SQL Editor, então não existe tabela de controle: a única fonte da verdade é o
-- que está de pé no schema. Este arquivo pergunta isso ao catálogo do Postgres.
--
-- Cada linha procura um objeto que SÓ aquela migration cria (tabela, coluna,
-- função, trigger ou um valor novo num CHECK). Rodar é seguro: é tudo leitura,
-- não muda nada.
--
-- USO: cola no SQL Editor do Supabase e roda. A coluna `estado` diz o que falta,
-- na ordem de aplicação.
-- =============================================================================

select
  migration,
  case when aplicada then '✓ aplicada' else '✗ FALTA' end as estado,
  pista
from (values

  ('0017_admin',            to_regclass('public.staff_permissions') is not null,
                            'tabela staff_permissions'),

  ('0018_equipe',           exists (select 1 from pg_constraint c
                                      join pg_class r on r.oid = c.conrelid
                                      join pg_namespace n on n.oid = r.relnamespace
                                     where n.nspname = 'public' and r.relname = 'subscriptions'
                                       and c.contype = 'c'
                                       and pg_get_constraintdef(c.oid) like '%pendente%'),
                            'subscriptions.status aceita ''pendente'''),

  ('0019_presentes',        to_regclass('public.gift_subscriptions') is not null,
                            'tabela gift_subscriptions'),

  ('0020_mural',            to_regclass('public.mural_notes') is not null,
                            'tabela mural_notes'),

  ('0021_indicacoes',       to_regclass('public.referrals') is not null,
                            'tabela referrals'),

  ('0022_avisos',           to_regclass('public.avisos_casa') is not null,
                            'tabela avisos_casa'),

  ('0023_trilha',           to_regclass('public.playlists_casa') is not null,
                            'tabela playlists_casa'),

  ('0024_perfil_publico',   exists (select 1 from information_schema.columns
                                     where table_schema = 'public' and table_name = 'profiles'
                                       and column_name = 'handle'),
                            'coluna profiles.handle'),

  ('0025_aniversario',      to_regclass('public.brindes_aniversario') is not null,
                            'tabela brindes_aniversario'),

  ('0026_agenda',           to_regclass('public.event_rsvps') is not null,
                            'tabela event_rsvps'),

  ('0027_cardapio_favs',    to_regclass('public.cardapio_favoritos') is not null,
                            'tabela cardapio_favoritos'),

  ('0028_agenda_quem_vai',  exists (select 1 from pg_proc p
                                      join pg_namespace n on n.oid = p.pronamespace
                                     where n.nspname = 'public' and p.proname = 'agenda_proximos'
                                       and pg_get_function_result(p.oid) like '%vao_publicos%'),
                            'agenda_proximos devolve vao_publicos'),

  ('0029_loja_desejos',     to_regclass('public.loja_desejos') is not null,
                            'tabela loja_desejos'),

  ('0030_avisos_reposicao', to_regclass('public.avisos_reposicao') is not null,
                            'tabela avisos_reposicao'),

  ('0031_lista_espera',     to_regclass('public.lista_espera') is not null,
                            'tabela lista_espera'),

  -- ---- a leva da auditoria de segurança ----

  ('0032_senha_master',     exists (select 1 from information_schema.columns
                                     where table_schema = 'public' and table_name = 'profiles'
                                       and column_name = 'senha_inicial_hash'),
                            'coluna profiles.senha_inicial_hash'),

  ('0033_cantinho_trava',   exists (select 1 from pg_trigger
                                     where tgname = 'trg_prevent_perfil_publico_tamper'
                                       and not tgisinternal),
                            'trigger trg_prevent_perfil_publico_tamper'),

  ('0034_lista_espera_rpc', to_regprocedure('public.entrar_na_lista_espera(text,text)') is not null,
                            'função entrar_na_lista_espera'),

  ('0035_orders_estornado', exists (select 1 from pg_constraint c
                                      join pg_class r on r.oid = c.conrelid
                                      join pg_namespace n on n.oid = r.relnamespace
                                     where n.nspname = 'public' and r.relname = 'orders'
                                       and c.contype = 'c'
                                       and pg_get_constraintdef(c.oid) like '%estornado%'),
                            'orders.status aceita ''estornado'''),

  ('0036_mural_cantinho',   exists (select 1 from pg_trigger
                                     where tgname = 'trg_prevent_mural_content_tamper'
                                       and not tgisinternal),
                            'trigger trg_prevent_mural_content_tamper')

) as t(migration, aplicada, pista)
order by migration;
