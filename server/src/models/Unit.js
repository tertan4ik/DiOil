const pool = require('../config/db');

class Unit {
    static async getAll() {
        const result = await pool.query('SELECT id, name, full_name FROM units ORDER BY id');
        return result.rows;
    }

    static async getOrCreate(name) {
        if (!name) return null;
        const existing = await pool.query('SELECT id FROM units WHERE name = $1', [name]);
        if (existing.rows.length) return existing.rows[0].id;
        const result = await pool.query('INSERT INTO units (name, full_name) VALUES ($1, $1) RETURNING id', [name]);
        return result.rows[0].id;
    }
}

module.exports = Unit;