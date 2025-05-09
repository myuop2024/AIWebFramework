import { execSync } from 'child_process';
import fs from 'fs';

// Create a file to pipe the input
fs.writeFileSync('push-input.txt', '1\ny\n');

try {
  // Use the file as input to the drizzle-kit push command
  execSync('drizzle-kit push < push-input.txt', { 
    stdio: ['pipe', process.stdout, process.stderr],
    timeout: 30000
  });
  console.log('Successfully pushed error_logs table to database!');
} catch (error) {
  console.error('Error pushing schema:', error.message);
} finally {
  // Clean up
  fs.unlinkSync('push-input.txt');
}