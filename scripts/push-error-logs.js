import { execSync } from 'child_process';
import fs from 'fs';

try {
  // Provide the automatic confirmation input directly to the command
  execSync('drizzle-kit push', {
    input: '1\ny\n',
    stdio: ['pipe', process.stdout, process.stderr],
    timeout: 30000
  });
  console.log('Successfully pushed error_logs table to database!');
} catch (error) {
  console.error('Error pushing schema:', error.message);
}
