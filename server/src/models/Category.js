const pool = require('../config/db');

class Category {
    static async getAll() {
        const result = await pool.query('SELECT * FROM categories ORDER BY id');
        return result.rows;
    }
}

module.exports = Category;