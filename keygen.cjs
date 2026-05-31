const { spawn } = require('child_process');

console.log("Anahtarlar oluşturuluyor...");

const child = spawn('npx', ['tauri', 'signer', 'generate', '-w', 'src-tauri/kickhat.key'], {
  shell: true,
  stdio: ['pipe', 'inherit', 'inherit']
});

// Şifre sorma aşamasını atlamak için boş enter gönder
child.stdin.write('\n');
setTimeout(() => {
  child.stdin.write('\n');
  child.stdin.end();
}, 500);

child.on('close', (code) => {
  console.log(`İşlem ${code} kodu ile tamamlandı.`);
});
