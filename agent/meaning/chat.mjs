// node agent/meaning/chat.mjs "sentence" ["next sentence" …]: a conversation, with the sentences' vectors
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
env.allowRemoteModels = false; env.localModelPath = path.join(here, '../../docs/agent/meaning/models/');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
const emb = async t => Float32Array.from((await pipe([t], { pooling: 'mean', normalize: true })).data);
const agent = require('../load.js').load({ random: () => 0 });
for (const s of process.argv.slice(2)) {
  const r = agent.respond(s, await emb(agent.clean(s)));
  console.log(`> ${s}\n  [${r.outcome}] ${r.say.slice(0, 160)}${(r.cards || []).map(c => `\n  card: ${c.title} — ${c.line}`).join('')}${r.command ? `\n  does: ${r.command}` : ''}\n  chips: ${r.chips.join(' · ')}\n  why: ${r.why}`);
}
console.log('inbox:', agent.inbox.map(e => `"${e.sentence}" (${e.why})`).join('; '));
