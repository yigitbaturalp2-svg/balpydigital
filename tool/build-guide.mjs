import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Statik HTML GitHub Pages'te derleyici olmadan açılır. JSON tek içerik
// kaynağıdır; üretilen ayrıntı blokları elle değiştirilmez.
const { marked } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'marked');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const topics = JSON.parse(await readFile(path.join(root, 'rehber/notes.json'), 'utf8'));
const page = path.join(root, 'rehber/index.html');
let html = await readFile(page, 'utf8');
const sectionIds = {
  intro: 'baslangic', collection: 'koleksiyon', overview: 'genel', sources: 'kaynaklar',
  notes: 'notlar', flashcards: 'kartlar', questions: 'sorular', home: 'ana-sayfa',
  planning: 'planlama', timer: 'sayac', statistics: 'profil', settings: 'ayarlar',
};
const escape = (text) => text.replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
for (const topic of topics) {
  const sectionId = sectionIds[topic.id];
  if (!sectionId) throw new Error(`Bölüm eşlemesi yok: ${topic.id}`);
  const begin = `<!-- BEGIN DETAILS: ${topic.id} -->`;
  const end = `<!-- END DETAILS: ${topic.id} -->`;
  const details = `${begin}\n<div class="topic-details"><p>Ayrıntılı kullanım notları · İhtiyacın olan başlığı aç</p>\n${topic.notes.map((note) => {
    const text = note.text.replace(/^## /gm, '### ').replace(/^(.+?) :: (.+)$/gm, '- **$1:** $2');
    let body = marked.parse(text);
    body = body.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
    return `<details class="note-detail"><summary>${escape(note.title)}</summary><div class="note-body">${body}</div></details>`;
  }).join('\n')}\n</div>\n${end}`;
  const start = html.indexOf(begin);
  if (start >= 0) {
    const stop = html.indexOf(end, start);
    if (stop < 0) throw new Error(`Ayrıntı bitişi yok: ${topic.id}`);
    html = html.slice(0, start) + details + html.slice(stop + end.length);
  } else {
    const sectionStart = html.indexOf(`id="${sectionId}"`);
    const sectionEnd = html.indexOf('</article>', sectionStart);
    if (sectionStart < 0 || sectionEnd < 0) throw new Error(`HTML bölümü bulunamadı: ${sectionId}`);
    html = html.slice(0, sectionEnd) + details + '\n' + html.slice(sectionEnd);
  }
}
await writeFile(page, html, 'utf8');
console.log(`${topics.length} bölüm ve ${topics.reduce((count, topic) => count + topic.notes.length, 0)} ayrıntılı not güncellendi.`);
