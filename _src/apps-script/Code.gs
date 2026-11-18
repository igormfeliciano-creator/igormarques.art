/**
 * Formulário de contato do igormarques.art
 *
 * Recebe o envio do site, guarda uma linha na planilha "Contatos" e manda um e-mail para você.
 * O "Responder" do e-mail vai direto para quem preencheu o formulário.
 *
 * @OnlyCurrentDoc  (o script só acessa esta planilha, nenhuma outra)
 */

// E-mail que recebe os contatos. Troque se quiser receber em outro endereço.
const DESTINO = 'igor.marques@igormarques.art';

// Campos do formulário, na ordem em que aparecem na planilha, com o limite de caracteres de cada um.
const CAMPOS = [
  ['nome', 'Nome', 120],
  ['email', 'E-mail', 120],
  ['whatsapp', 'WhatsApp', 25],
  ['marca', 'Marca ou empresa', 120],
  ['site', 'Instagram ou site', 120],
  ['busca', 'O que está buscando', 60],
  ['momento', 'Momento do negócio', 60],
  ['segmento', 'Segmento', 120],
  ['necessidade', 'Do que precisa', 60],
  ['prazo', 'Para quando', 60],
  ['investimento', 'Investimento', 60],
  ['origem', 'Como conheceu', 60],
  ['detalhes', 'Sobre o projeto', 300],
  ['idioma', 'Idioma', 10],
  ['pagina', 'Página', 120],
];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Campo invisível: pessoas não preenchem, robôs sim. Se veio preenchido, ignora sem avisar.
  if (p.website) return resposta_(true);

  // Limpa e corta cada campo no tamanho máximo.
  const dados = {};
  CAMPOS.forEach(function (c) {
    dados[c[0]] = String(p[c[0]] || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, c[2]);
  });

  // Obrigatórios e formato do e-mail.
  if (!dados.nome || !dados.whatsapp || !dados.busca || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dados.email)) {
    return resposta_(false, 'dados');
  }

  // Bloqueia envios repetidos do mesmo e-mail em menos de 2 minutos.
  const cache = CacheService.getScriptCache();
  const chave = 'envio:' + dados.email.toLowerCase();
  if (cache.get(chave)) return resposta_(true);
  cache.put(chave, '1', 120);

  // 1) Guarda na planilha.
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName('Contatos');
  if (!aba) {
    aba = planilha.insertSheet('Contatos');
    aba.appendRow(['Data'].concat(CAMPOS.map(function (c) { return c[1]; })));
    aba.setFrozenRows(1);
  }
  // O apóstrofo impede que um texto começando com "=" vire fórmula na planilha.
  aba.appendRow([new Date()].concat(CAMPOS.map(function (c) {
    const v = dados[c[0]];
    return /^[=+\-@]/.test(v) ? "'" + v : v;
  })));

  // 2) Manda o e-mail para você.
  const linhas = CAMPOS
    .filter(function (c) { return dados[c[0]]; })
    .map(function (c) { return c[1] + ': ' + dados[c[0]]; });
  MailApp.sendEmail({
    to: DESTINO,
    replyTo: dados.email,
    name: 'Site igormarques.art',
    subject: 'Novo contato pelo site: ' + dados.nome + (dados.marca ? ' (' + dados.marca + ')' : ''),
    body: linhas.join('\n') + '\n\nPara responder, é só clicar em "Responder".',
  });

  return resposta_(true);
}

function resposta_(ok, erro) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, erro: erro || null }))
    .setMimeType(ContentService.MimeType.JSON);
}
