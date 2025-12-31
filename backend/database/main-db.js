const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const net = require('net');

let mainDbPool = null;
let sshClient = null;
let localPort = null;

/**
 * Connection to the main system database via SSH tunnel
 * This connects through SSH first, then to MySQL
 */
const initMainDatabase = async () => {
  try {
    // SSH Tunnel Configuration
    const sshKeyPath = process.env.MAIN_SSH_KEY_PATH || 'C:/Users/HP/.ssh/id_rsa';
    const sshKeyPassphrase = process.env.MAIN_SSH_KEY_PASSPHRASE || null;
    const sshPassword = process.env.MAIN_SSH_PASSWORD || null;
    
    // Build SSH config
    const sshConfig = {
      host: process.env.MAIN_SSH_HOST || '123.253.22.20',
      port: parseInt(process.env.MAIN_SSH_PORT || '22'),
      username: process.env.MAIN_SSH_USER || 'root',
      tryKeyboard: true, // Try keyboard-interactive authentication
      readyTimeout: 20000, // 20 second timeout
      // Explicitly disable agent forwarding to avoid auto-loading keys
      agent: undefined,
      agentForward: false,
      debug: (info) => {
        // Only log important debug info
        if (info.includes('error') || info.includes('auth')) {
          console.log('   SSH Debug:', info);
        }
      },
    };
    
    // PRIORITY: Use password if provided (skip key file completely)
    if (sshPassword) {
      sshConfig.password = sshPassword;
      // Explicitly don't use any key files when password is provided
      sshConfig.privateKey = undefined;
      console.log('   Using SSH password authentication (key file will be ignored)');
    } 
    // Fallback: Only use SSH key if password is NOT set
    else if (sshKeyPath && require('fs').existsSync(sshKeyPath)) {
      try {
        // Check file size to avoid reading wrong file (real key should be > 1KB)
        const stats = require('fs').statSync(sshKeyPath);
        if (stats.size < 2000) {
          console.log('⚠️  SSH key file seems too small, might be wrong file');
        }
        
        sshConfig.privateKey = require('fs').readFileSync(sshKeyPath);
        if (sshKeyPassphrase) {
          sshConfig.passphrase = sshKeyPassphrase;
          console.log('   Using SSH key with passphrase');
        } else {
          console.log('   Using SSH key without passphrase');
        }
      } catch (error) {
        console.log('⚠️  Could not read SSH key:', error.message);
        throw new Error('SSH key read failed. Set MAIN_SSH_PASSWORD instead.');
      }
    }
    
    // Validate we have at least one auth method
    if (!sshConfig.privateKey && !sshConfig.password) {
      throw new Error('Either MAIN_SSH_KEY_PATH (with optional MAIN_SSH_KEY_PASSPHRASE) or MAIN_SSH_PASSWORD must be provided');
    }

    // MySQL Configuration (remote server, accessed through SSH tunnel)
    const remoteMysqlHost = process.env.MAIN_DB_REMOTE_HOST || '127.0.0.1';
    const remoteMysqlPort = parseInt(process.env.MAIN_DB_REMOTE_PORT || '3306');
    const mysqlUser = process.env.MAIN_DB_USER || 'r2o_admin';
    const mysqlPassword = process.env.MAIN_DB_PASSWORD || process.env.MAIN_DB_PASS || '';
    const mysqlDatabase = process.env.MAIN_DB_NAME || 'r2o_db';
    
    if (!mysqlPassword) {
      console.log('⚠️  Warning: MAIN_DB_PASSWORD is empty. Make sure MySQL password is set in .env');
    }

    console.log('🔐 Establishing SSH tunnel to main database...');
    console.log(`   SSH: ${sshConfig.username}@${sshConfig.host}:${sshConfig.port}`);
    console.log(`   MySQL: ${mysqlUser}@${remoteMysqlHost}:${remoteMysqlPort}/${mysqlDatabase}`);

    // Create SSH connection
    sshClient = new Client();

    // Create a local server that forwards to remote MySQL
    return new Promise((resolve, reject) => {
      // Handle keyboard-interactive authentication (some servers require this)
      sshClient.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        if (sshPassword && prompts.length > 0) {
          // Respond to password prompt
          finish([sshPassword]);
        } else {
          finish([]);
        }
      });
      
      sshClient
        .on('ready', () => {
          console.log('✅ SSH connection established');

          // Create local port forward
          sshClient.forwardOut(
            '127.0.0.1',
            0, // Let SSH choose local port
            remoteMysqlHost,
            remoteMysqlPort,
            (err, stream) => {
              if (err) {
                reject(err);
                return;
              }

              // Create a local TCP server that forwards to SSH stream
              const server = net.createServer((localConnection) => {
                localConnection.pipe(stream).pipe(localConnection);
              });

              server.listen(0, '127.0.0.1', () => {
                localPort = server.address().port;
                console.log(`✅ SSH tunnel established on local port ${localPort}`);

                // Now create MySQL connection through local port
                mainDbPool = mysql.createPool({
                  host: '127.0.0.1',
                  port: localPort,
                  user: mysqlUser,
                  password: mysqlPassword,
                  database: mysqlDatabase,
                  waitForConnections: true,
                  connectionLimit: 5,
                  queueLimit: 0,
                });

                // Test connection
                mainDbPool
                  .getConnection()
                  .then((conn) => {
                    console.log('✅ Connected to main database via SSH tunnel');
                    conn.release();
                    resolve(mainDbPool);
                  })
                  .catch((err) => {
                    console.error('❌ MySQL connection through tunnel failed:', err.message);
                    reject(err);
                  });
              });

              server.on('error', (err) => {
                console.error('❌ Local server error:', err.message);
                reject(err);
              });
            }
          );
        })
        .on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
          // Handle keyboard-interactive authentication
          if (sshPassword && prompts.length > 0) {
            finish([sshPassword]);
          } else {
            finish([]);
          }
        })
        .on('error', (err) => {
          console.error('❌ SSH connection error:', err.message);
          if (err.message.includes('passphrase')) {
            console.log('💡 SSH key is encrypted. Check MAIN_SSH_KEY_PASSPHRASE in .env');
          } else if (err.message.includes('ENOENT')) {
            console.log('💡 SSH key file not found. Check MAIN_SSH_KEY_PATH in .env');
          } else if (err.message.includes('authentication methods failed')) {
            console.log('💡 SSH authentication failed. Possible issues:');
            console.log('   1. SSH password is incorrect');
            console.log('   2. SSH server does not allow password authentication');
            console.log('   3. Username or host is wrong');
            console.log('   4. Firewall blocking connection');
            console.log('');
            console.log('💡 Try testing SSH manually:');
            console.log(`   ssh ${sshConfig.username}@${sshConfig.host}`);
            console.log('   If that works, the password in .env might be wrong');
          } else {
            console.log('💡 Check SSH credentials: host, user, password');
          }
          reject(err);
        })
        .connect(sshConfig);
    });
  } catch (error) {
    console.error('❌ Main database connection error:', error.message);
    if (error.code === 'ENOENT') {
      console.log('💡 SSH key file not found. Check MAIN_SSH_KEY_PATH in .env');
    }
    throw error;
  }
};

// Get main database pool
const getMainDatabase = () => {
  if (!mainDbPool) {
    throw new Error('Main database not initialized. Call initMainDatabase() first.');
  }
  return mainDbPool;
};

// Close main database connection
const closeMainDatabase = async () => {
  if (mainDbPool) {
    await mainDbPool.end();
    mainDbPool = null;
  }
  if (sshClient) {
    sshClient.end();
    sshClient = null;
  }
  console.log('✅ Main database connection closed');
};

module.exports = {
  mainDbPool,
  getMainDatabase,
  initMainDatabase,
  closeMainDatabase,
};
