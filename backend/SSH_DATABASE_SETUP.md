# SSH Database Connection Setup

## Configuration

Your main database requires SSH tunneling. Update your `backend/.env` file with these settings:

```env
# SSH Tunnel Configuration
MAIN_SSH_HOST=123.253.22.20
MAIN_SSH_PORT=22
MAIN_SSH_USER=root
MAIN_SSH_KEY_PATH=C:/Users/HP/.ssh/id_rsa
MAIN_SSH_KEY_PASSPHRASE=your_ssh_key_passphrase_here  # If your SSH key is encrypted

# MySQL Configuration (through SSH tunnel)
MAIN_DB_REMOTE_HOST=127.0.0.1
MAIN_DB_REMOTE_PORT=3306
MAIN_DB_USER=r2o_admin
MAIN_DB_PASSWORD=your_mysql_password_here  # IMPORTANT: Add your actual MySQL password
MAIN_DB_NAME=r2o_db
```

## SSH Key Setup

### Option 1: Use Existing SSH Key

If you already have an SSH key:
1. Find your SSH key file (usually in `C:/Users/HP/.ssh/id_rsa`)
2. Set `MAIN_SSH_KEY_PATH` to the full path

### Option 2: Generate New SSH Key

If you don't have an SSH key:
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Save to: C:/Users/HP/.ssh/id_rsa
```

### Option 3: Use Password Instead of Key

If you prefer password authentication, update `backend/database/main-db.js`:

Change:
```javascript
privateKey: require('fs').readFileSync(process.env.MAIN_SSH_KEY_PATH),
```

To:
```javascript
password: process.env.MAIN_SSH_PASSWORD,
```

And add to `.env`:
```env
MAIN_SSH_PASSWORD=your_ssh_password
```

## Testing Connection

After updating `.env`, restart the backend server:

```bash
cd backend
npm install  # Install ssh2 package
npm run dev
```

You should see:
```
✅ SSH connection established
✅ SSH tunnel established on local port XXXX
✅ Connected to main database via SSH tunnel
```

## Troubleshooting

### Error: "SSH key file not found"
- Check that `MAIN_SSH_KEY_PATH` points to the correct file
- Make sure the path uses forward slashes or double backslashes: `C:/Users/HP/.ssh/id_rsa` or `C:\\Users\\HP\\.ssh\\id_rsa`

### Error: "SSH connection error"
- Verify SSH host, port, and username are correct
- Check if SSH key has correct permissions
- Try using password authentication instead

### Error: "MySQL connection through tunnel failed"
- Verify MySQL credentials (user, password, database name)
- Check remote MySQL host and port
- Make sure MySQL is running on the remote server

## Security Note

⚠️ **Important**: Never commit your `.env` file or SSH keys to version control!

Add to `.gitignore`:
```
.env
*.pem
*.key
.ssh/
```

