const pool = require('../config/db');

class Favorite {
    static async getByUser(userId) {
        const result = await pool.query(
            `SELECT p.*, u.name as unit_name, b.name as brand_name
             FROM favorites f
             JOIN products p ON f.product_id = p.id
             LEFT JOIN units u ON p.unit_id = u.id
             LEFT JOIN brands b ON p.brand_id = b.id
             WHERE f.user_id = $1`,
            [userId]
        );
        return result.rows;
    }

    static async add(userId, productId) {
        await pool.query(
            'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, productId]
        );
    }

    static async remove(userId, productId) {
        await pool.query('DELETE FROM favorites WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    }
}

module.exports = Favorite;