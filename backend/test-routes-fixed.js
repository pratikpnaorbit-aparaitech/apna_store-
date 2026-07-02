const fs = require('fs');
const path = require('path');

const routesDir = './routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

console.log('Testing each route file...\n');

files.forEach(file => {
  try {
    console.log(`Testing ${file}...`);
    // Use correct path with ./
    const route = require(`./routes/${file}`);
    console.log(`✅ ${file} - OK`);
  } catch (err) {
    console.log(`❌ ${file} - ERROR: ${err.message}`);
    if (err.stack) {
      console.log(err.stack.split('\n')[1]);
    }
  }
  console.log('---');
});
