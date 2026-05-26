const pool = require('../config/db');

class Brand {
    static async getAll() {
        const result = await pool.query('SELECT id, name FROM brands ORDER BY name');
        return result.rows;
    }

    static async getOrCreate(name) {
        if (!name) return null;
        const existing = await pool.query('SELECT id FROM brands WHERE name = $1', [name]);
        if (existing.rows.length) return existing.rows[0].id;
        const result = await pool.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [name]);
        return result.rows[0].id;
    }
}

module.exports = Brand;