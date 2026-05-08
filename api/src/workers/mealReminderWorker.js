const { processDuePlannerReminders } = require('../services/plannerReminderService');

const DEFAULT_INTERVAL_MS = 5 * 1000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await processDuePlannerReminders({
      limit: Number(process.env.MEAL_REMINDER_WORKER_LIMIT || 50),
    });
    if (result.claimed > 0) {
      console.log(`[mealReminderWorker] processed ${result.claimed} due reminder(s).`);
    }
  } catch (err) {
    console.error('[mealReminderWorker] failed:', err);
  } finally {
    running = false;
  }
}

function startMealReminderWorker() {
  if (timer) return;
  if (process.env.MEAL_REMINDER_WORKER_ENABLED === 'false') {
    console.log('[mealReminderWorker] disabled by MEAL_REMINDER_WORKER_ENABLED=false');
    return;
  }

  const intervalMs = Math.max(
    1000,
    Number(process.env.MEAL_REMINDER_WORKER_INTERVAL_MS || DEFAULT_INTERVAL_MS)
  );

  timer = setInterval(tick, intervalMs);
  timer.unref?.();
  tick().catch(() => {});
  console.log(`[mealReminderWorker] running every ${intervalMs}ms`);
}

function stopMealReminderWorker() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = {
  startMealReminderWorker,
  stopMealReminderWorker,
  tick,
};
