import { syncMetall90 } from '../src/sync/metall90';

syncMetall90()
  .then(() => {
    console.log('✅ Синхронизация завершена');
  })
  .catch((e) => {
    console.error('❌ Ошибка:', e);
  })
  .finally(() => process.exit());