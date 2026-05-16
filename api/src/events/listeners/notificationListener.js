const { pool } = require('../../config/db');
const logger = require('../../config/logger');
const { sendMail } = require('../../config/mailer');

/**
 * Listener: Send in-app notifications + email to all opted-in users
 * when a new recipe is created by an admin.
 */
async function onRecipeCreated({ recipeId, title, imageUrl, authorId }) {
  try {
    const usersResult = await pool.query(
      `SELECT u.id, u.email, u.full_name,
              (us.settings_value->>'emailNotifications')::text AS email_notif,
              (us.settings_value->>'newRecipeAlerts')::text AS recipe_alerts
       FROM users u
       LEFT JOIN public.user_settings us
         ON us.user_id = u.id AND us.settings_key = 'notifications'
       WHERE (u.role = 'user' OR u.role = 'admin')
         AND ($1::int IS NULL OR u.id != $1)`,
      [authorId]
    );

    const eligibleUsers = usersResult.rows.filter(u => {
      const emailOn = u.email_notif === null || u.email_notif === 'true';
      const alertOn = u.recipe_alerts === null || u.recipe_alerts === 'true';
      return emailOn && alertOn;
    });

    if (eligibleUsers.length === 0) return;

    const appUrl = process.env.APP_URL || 'https://cookmate.app';
    const recipeUrl = `${appUrl}/recipe/${recipeId}`;

    // Email (single BCC)
    const bccEmails = eligibleUsers.map(u => u.email).filter(Boolean);
    if (bccEmails.length > 0) {
      const subject = `New Recipe Added: ${title}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">New Recipe Available!</h2>
          <p>Hi there,</p>
          <p>We're excited to share a new recipe with you: <strong>${title}</strong></p>
          ${imageUrl ? `<img src="${imageUrl}" alt="${title}" style="max-width: 100%; border-radius: 8px; margin: 16px 0;" />` : ''}
          <p>Click the link below to check it out:</p>
          <a href="${recipeUrl}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Recipe</a>
          <p style="margin-top: 24px; color: #666; font-size: 12px;">You're receiving this because you're a CookMate user.</p>
        </div>
      `;
      sendMail({
        to: process.env.SMTP_FROM || 'noreply@cookmate.app',
        bcc: bccEmails.join(','),
        subject,
        html: htmlContent,
        text: `New Recipe: ${title}\n\nCheck it out at: ${recipeUrl}`,
      }).catch(err => logger.error('[event/recipe.created] email failed:', err.message));
    }

    // In-app notifications
    const notifPromises = eligibleUsers.map(user =>
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         VALUES ($1, $2, $3, 'Recipe', FALSE)`,
        [user.id, `New Recipe: ${title}`, `A new recipe "${title}" has been added. Check it out!`]
      ).catch(err => logger.error(`[event/recipe.created] notification for user ${user.id} failed:`, err.message))
    );

    await Promise.allSettled(notifPromises);
    logger.info(`[event/recipe.created] Notified ${eligibleUsers.length} users about: ${title}`);
  } catch (err) {
    logger.error('[event/recipe.created] listener error:', err);
  }
}

module.exports = { onRecipeCreated };
