const cron = require('node-cron');
const db = require('./db');

const HP_DECAY_PER_DAY = 20;
const EARN_PER_DAY = 80;

// Run every hour — decay HP for unfed NFTs
function startCronJobs() {
  // HP Decay — every hour, check last_fed and reduce HP
  cron.schedule('0 * * * *', () => {
    console.log('[CRON] Running HP decay check...');

    const staked = db.prepare('SELECT * FROM staked_nfts').all();
    const now = new Date();

    const updateHp = db.prepare('UPDATE staked_nfts SET hp = ? WHERE id = ?');
    const moveToMuseum = db.prepare(`
      INSERT INTO museum (token_id, collection_addr, name, image_url, original_owner, caught_by, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const deleteStaked = db.prepare('DELETE FROM staked_nfts WHERE id = ?');

    let decayed = 0;
    let caught = 0;

    const decayAll = db.transaction(() => {
      for (const nft of staked) {
        const lastFed = new Date(nft.last_fed + 'Z');
        const hoursSinceFed = (now - lastFed) / (1000 * 60 * 60);

        let newHp = 100;
        if (hoursSinceFed >= 48) {
          newHp = 50; // 2+ days unfed — catchable
        } else if (hoursSinceFed >= 24) {
          newHp = 80; // 1 day unfed — hungry
        }

        if (newHp !== nft.hp) {
          updateHp.run(newHp, nft.id);
          decayed++;
        }
      }
    });
    decayAll();

    console.log(`[CRON] HP decay done. ${decayed} NFTs updated.`);
  });

  // Auto-earn — every 6 hours, add pending earnings
  cron.schedule('0 */6 * * *', () => {
    console.log('[CRON] Running auto-earn...');
    // Earnings are calculated on claim, no need to pre-add
    console.log('[CRON] Auto-earn: earnings calculated on claim.');
  });

  console.log('[CRON] Cron jobs started.');
}

module.exports = { startCronJobs };
