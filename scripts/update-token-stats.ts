// scripts/update-token-stats.ts
import { supabase } from '../src/lib/database/config';

async function updateTokenStats() {
  console.log('📊 Обновление статистики токенов...');

  try {
    // Получаем все действия пользователей за последний период
    const { data: actions, error: actionsError } = await supabase
      .from('user_actions')
      .select(`
        vacancy_id,
        action,
        user_id,
        created_at,
        vacancies!inner(
          matched_tokens
        )
      `)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // За последние 24 часа

    if (actionsError) {
      console.error('❌ Ошибка получения действий:', actionsError);
      return;
    }

    // Группируем по токенам
    const tokenStats = new Map<number, { hides_count: number; unique_users: Set<string> }>();

    for (const action of actions || []) {
      if (action.action === 'hide_vacancy' || action.action === 'thumbs_down') {
        const matchedTokens = Array.isArray(action.vacancies) 
          ? action.vacancies.flatMap((v: any) => v.matched_tokens || [])
          : (action.vacancies as any)?.matched_tokens || [];
        
        for (const token of matchedTokens) {
          const tokenId = token.token_id;
          
          if (!tokenStats.has(tokenId)) {
            tokenStats.set(tokenId, { hides_count: 0, unique_users: new Set() });
          }
          
          const stats = tokenStats.get(tokenId)!;
          stats.hides_count += 1;
          stats.unique_users.add(action.user_id);
        }
      }
    }

    // Обновляем статистику в БД
    for (const [tokenId, stats] of tokenStats) {
      const { error: updateError } = await supabase
        .from('global_token_stats')
        .upsert({
          token_id: tokenId,
          hides_count: stats.hides_count,
          unique_users: stats.unique_users.size,
          last_used_at: new Date().toISOString()
        });

      if (updateError) {
        console.error(`❌ Ошибка обновления статистики для токена ${tokenId}:`, updateError);
      } else {
        console.log(`✅ Обновлена статистика для токена ${tokenId}: ${stats.hides_count} скрытий, ${stats.unique_users.size} пользователей`);
      }
    }

    console.log(`✅ Статистика обновлена для ${tokenStats.size} токенов`);

  } catch (error) {
    console.error('❌ Критическая ошибка обновления статистики:', error);
  }
}

// Запускаем обновление
updateTokenStats();

