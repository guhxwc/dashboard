-- =========================================================================
-- CONFIGURAÇÃO DE RESET DE STREAK À MEIA NOITE
-- Instruções: Copie todo este código e execute no SQL Editor do Supabase.
-- =========================================================================

-- 1. Habilita a extensão pg_cron (para agendar tarefas automáticas no banco)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Cria a função que verifica quem não fez nada ontem e zera o streak (ofensiva)
CREATE OR REPLACE FUNCTION reset_expired_streaks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Zera o 'streak' e 'current_streak' para quem tem streak > 0 
  -- e NÃO possui registro na daily_goals_met com a data de ONTEM (Horário de Brasília).
  UPDATE public.profiles
  SET 
    streak = 0,
    current_streak = 0
  WHERE 
    (COALESCE(streak, 0) > 0 OR COALESCE(current_streak, 0) > 0)
    AND id NOT IN (
      SELECT user_id
      FROM public.daily_goals_met
      WHERE date = TO_CHAR((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '1 day', 'YYYY-MM-DD')
    );
    
  -- Como todos "começam no 0", quem estava nulo será iniciado com 0.
  UPDATE public.profiles
  SET 
    streak = 0,
    current_streak = 0
  WHERE streak IS NULL AND current_streak IS NULL;
END;
$$;

-- 3. Remove agendamentos antigos (caso você vá rodar isso mais de uma vez)
-- (ignora erro se não existir)
DO $$
BEGIN
  PERFORM cron.unschedule('reset-streaks-midnight');
EXCEPTION WHEN OTHERS THEN
END;
$$;

-- 4. Agenda a rotina para rodar TODA MEIA-NOITE E UM MINUTO (00:01) no FUSO DE BRASÍLIA
-- Supabase roda em UTC. 00:01 em Brasília (BRT) = 03:01 em UTC.
SELECT cron.schedule(
  'reset-streaks-midnight',
  '1 3 * * *', -- Executa às 03:01 UTC (00:01 BRT) todos os dias
  $$SELECT public.reset_expired_streaks()$$
);

-- FIM DA CONFIGURAÇÃO
