const { getDatabase } = require('../database/init');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.password = data.password;
    this.email = data.email;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.role = data.role || 'user';
    this.isActive = data.is_active === 1 || data.is_active === true;
    this.phone = data.phone;
    this.address = data.address;
    this.lastLogin = data.last_login;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Convert to JSON (without password)
  toJSON() {
    const { password, ...user } = this;
    return user;
  }

  // Compare password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Find user by username
  static async findByUsername(username) {
    const db = getDatabase();
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return null;
    }

    return new User(rows[0]);
  }

  // Find user by ID
  static async findById(id) {
    const db = getDatabase();
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);

    if (rows.length === 0) {
      return null;
    }

    return new User(rows[0]);
  }

  // Create new user
  static async create(userData) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const db = getDatabase();
      const [result] = await db.execute(
        `INSERT INTO users (username, password, email, first_name, last_name, role, phone, address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.username.toLowerCase().trim(),
          hashedPassword,
          userData.email || null,
          userData.firstName || null,
          userData.lastName || null,
          userData.role || 'user',
          userData.phone || null,
          userData.address || null,
        ]
      );

      // Return the created user
      return await User.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Update last login
  async updateLastLogin() {
    const db = getDatabase();
    await db.execute(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = ?',
      [this.id]
    );
    this.lastLogin = new Date();
    return this;
  }

  // Update user
  async update(updates) {
    try {
      const db = getDatabase();
      const fields = [];
      const values = [];

      if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
      }
      if (updates.firstName !== undefined) {
        fields.push('first_name = ?');
        values.push(updates.firstName);
      }
      if (updates.lastName !== undefined) {
        fields.push('last_name = ?');
        values.push(updates.lastName);
      }
      if (updates.phone !== undefined) {
        fields.push('phone = ?');
        values.push(updates.phone);
      }
      if (updates.address !== undefined) {
        fields.push('address = ?');
        values.push(updates.address);
      }
      if (updates.role !== undefined) {
        fields.push('role = ?');
        values.push(updates.role);
      }
      if (updates.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.isActive ? 1 : 0);
      }

      if (fields.length === 0) {
        return this;
      }

      values.push(this.id);

      await db.execute(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

      // Reload user data
      const updatedUser = await User.findById(this.id);
      Object.assign(this, updatedUser);
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  async delete() {
    const db = getDatabase();
    await db.execute('DELETE FROM users WHERE id = ?', [this.id]);
    return true;
  }
}

module.exports = User;
