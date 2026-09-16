import net from 'node:net';
import fs from 'node:fs/promises';

const PORT = Number(process.env.KLASSIO_E2E_SMTP_PORT || 2525);
const OUT = process.env.KLASSIO_E2E_SMTP_CODES || '/tmp/klassio-e2e-mail-codes.json';

let queue = Promise.resolve();

async function persist(email, code, subject) {
  queue = queue.then(async () => {
    let data = {};
    try {
      data = JSON.parse(await fs.readFile(OUT, 'utf8'));
    } catch {}
    const capturedAt = new Date().toISOString();
    if (code) data[email.toLowerCase()] = { code, capturedAt };
    const messages = Array.isArray(data.__messages) ? data.__messages : [];
    messages.push({ to: email.toLowerCase(), code: code || null, subject: subject || '', capturedAt });
    data.__messages = messages.slice(-100);
    await fs.writeFile(OUT, JSON.stringify(data, null, 2), 'utf8');
    console.log('Captured Klassio message for', email, code ? '(login code)' : '(notification)');
  });
  await queue;
}

function extractMessage(raw) {
  const toMatch = raw.match(/^To:\s*([^\r\n]+)/im);
  const codeMatch = raw.match(/\b(\d{6})\b/);
  const subjectMatch = raw.match(/^Subject:\s*([^\r\n]+)/im);
  const email = toMatch?.[1]?.replace(/[<>]/g, '').trim().toLowerCase();
  const code = codeMatch?.[1];
  const subject = subjectMatch?.[1]?.trim() || '';
  return email ? { email, code, subject } : null;
}

const server = net.createServer(socket => {
  socket.setEncoding('utf8');
  socket.write('220 klassio-e2e.local ESMTP\r\n');

  let buffer = '';
  let inData = false;
  let dataBuffer = '';

  const respondLine = async line => {
    const upper = line.toUpperCase();

    if (inData) {
      if (line === '.') {
        inData = false;
        const message = extractMessage(dataBuffer);
        dataBuffer = '';
        if (message) await persist(message.email, message.code, message.subject);
        socket.write('250 2.0.0 queued\r\n');
      } else {
        dataBuffer += line + '\r\n';
      }
      return;
    }

    if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
      socket.write('250-klassio-e2e.local\r\n250 PIPELINING\r\n');
    } else if (upper.startsWith('MAIL FROM:') || upper.startsWith('RCPT TO:')) {
      socket.write('250 2.1.0 ok\r\n');
    } else if (upper === 'DATA') {
      inData = true;
      socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
    } else if (upper === 'RSET' || upper === 'NOOP') {
      socket.write('250 2.0.0 ok\r\n');
    } else if (upper === 'QUIT') {
      socket.write('221 2.0.0 bye\r\n');
      socket.end();
    } else {
      socket.write('250 2.0.0 ok\r\n');
    }
  };

  socket.on('data', chunk => {
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || '';
    for (const line of parts) {
      void respondLine(line);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Klassio E2E SMTP listening on 127.0.0.1:' + PORT);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
