// Simple cleanup script to fix application startup issues
import { exec } from 'child_process';
import net from 'net';

// Check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        // Port is in use
        resolve(true);
      })
      .once('listening', () => {
        // Port is free
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

// Kill processes that might be causing issues
async function killProcesses() {
  console.log('Checking for processes to clean up...');
  
  // Kill Node processes
  exec('pkill -f "node|tsx|vite"', (error) => {
    if (error) {
      console.log('No Node processes found to kill');
    } else {
      console.log('Successfully killed Node processes');
    }
  });
  
  // Check critical ports
  const ports = [3000, 3001, 5000, 8000];
  for (const port of ports) {
    const inUse = await isPortInUse(port);
    console.log(`Port ${port} is ${inUse ? 'in use' : 'available'}`);
  }
  
  console.log('Cleanup complete. You can now restart the application.');
}

// Run the cleanup
killProcesses();