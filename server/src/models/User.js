const pool = require('../config/db');

class User {
    static async create({ name, email, password, phone, role = 'customer' }) {
        const result = await pool.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role',
            [name, email, password, phone, role]
        );
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async update(id, fields) {
        const { name, email, phone, role } = fields;
        const result = await pool.query(
            'UPDATE users SET name=$1, email=$2, phone=$3, role=$4 WHERE id=$5 RETURNING id, name, email, phone, role',
            [name, email, phone, role, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
    }

    static async getAll() {
        const result = await pool.query('SELECT id, name, email, phone, role, created_at FROM users');
        return result.rows;
    }
}

module.exports = User;