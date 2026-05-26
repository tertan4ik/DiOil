const pool = require('../config/db');

class Cart {
    static async getByUser(userId) {
        const result = await pool.query(
            `SELECT c.*, p.name, p.price, p.image, 
                    u.name as unit_name
             FROM cart c
             JOIN products p ON c.product_id = p.id
             LEFT JOIN units u ON p.unit_id = u.id
             WHERE c.user_id = $1`,
            [userId]
        );
        const items = result.rows;
        const total = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        return { items, total };
    }

    static async addItem(userId, productId, quantity = 1) {
        await pool.query(
            `INSERT INTO cart (user_id, product_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, product_id)
             DO UPDATE SET quantity = cart.quantity + $3`,
            [userId, productId, quantity]
        );
    }

    static async updateQuantity(userId, productId, quantity) {
        await pool.query(
            'UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
            [quantity, userId, productId]
        );
    }

    static async removeItem(userId, productId) {
        await pool.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    }

    static async clear(userId) {
        await pool.query('DELETE FROM cart WHERE user_id = $1', [userId]);
    }
}

module.exports = Cart;