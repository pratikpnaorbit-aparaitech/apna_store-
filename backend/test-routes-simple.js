const fs = require('fs');
const path = require('path');

const routesDir = './routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

console.log('Testing each route file...\n');

files.forEach(file => {
  try {
    console.log(`Testing ${file}...`);
    const route = require(path.join('./routes', file));
    console.log(`✅ ${file} - OK`);
  } catch (err) {
    console.log(`❌ ${file} - ERROR: ${err.message}`);
  }
  console.log('---');
});
