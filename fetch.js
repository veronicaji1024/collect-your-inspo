import https from 'https';
import fs from 'fs';

https.get('https://uk.pinterest.com/pin/20758848278337340/', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('pin.html', data);
    console.log('Saved to pin.html');
  });
});
