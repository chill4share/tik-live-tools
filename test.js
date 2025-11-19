// test-ttc.js
const { WebcastPushConnection } = require('tiktok-live-connector');

async function main() {
  const username = process.argv[2];
  if (!username) return console.error('Usage: node test-ttc.js <username>');
  const client = new WebcastPushConnection(username.replace(/^@/, ''));
  client.on('connected', () => console.log(new Date().toISOString(), 'CONNECTED'));
  client.on('disconnected', (r) => console.log(new Date().toISOString(), 'DISCONNECTED', r));
  client.on('chat', (d) => console.log(new Date().toISOString(), 'CHAT:', d.comment || JSON.stringify(d)));
  client.on('comment', (d) => console.log(new Date().toISOString(), 'COMMENT:', d.comment || JSON.stringify(d)));
  client.on('gift', (d) => console.log(new Date().toISOString(), 'GIFT:', JSON.stringify(d)));
  client.on('error', (e) => console.error(new Date().toISOString(),'ERR', e && e.stack || e));
  // raw emits
  const orig = client.emit;
  client.emit = function(ev, ...a){ console.log(new Date().toISOString(),'EMIT', ev); return orig.apply(this, [ev, ...a]); };

  try {
    await client.connect();
    console.log(new Date().toISOString(), 'Listening for events...');
  } catch (e) {
    console.error('CONNECT FAILED', e);
    process.exit(1);
  }
}

main();
