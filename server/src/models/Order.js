const pool = require('../config/db');

class Order {
    // Создание заказа с поддержкой типа доставки (courier / pickup)
    static async create(userId, { deliveryType, deliveryAddress, paymentMethod, total, items }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Определяем финальный адрес доставки
            let finalAddress = deliveryAddress;
            if (deliveryType === 'pickup') {
                const settingsRes = await client.query('SELECT value FROM settings WHERE key = $1', ['pickup_address']);
                finalAddress = settingsRes.rows[0]?.value || 'г. Екатеринбург, ул. Токарей, 45';
            }

            const orderResult = await client.query(
                `INSERT INTO orders (user_id, total, delivery_address, payment_method, delivery_type)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [userId, total, finalAddress, paymentMethod, deliveryType]
            );

            for (const item of items) {
                await client.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, price_at_moment)
                     VALUES ($1, $2, $3, $4)`,
                    [orderResult.rows[0].id, item.productId, item.quantity, item.price]
                );
            }

            await client.query('DELETE FROM cart WHERE user_id = $1', [userId]);
            await client.query('COMMIT');
            return orderResult.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Получение заказов пользователя
    static async getByUser(userId) {
        const result = await pool.query(
            `SELECT o.*,
                COALESCE(
                    (SELECT json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price_at_moment, 'unit_name', u.name))
                     FROM order_items oi
                     JOIN products p ON oi.product_id = p.id
                     LEFT JOIN units u ON p.unit_id = u.id
                     WHERE oi.order_id = o.id),
                    '[]'::json
                ) as items
             FROM orders o
             WHERE o.user_id = $1
             ORDER BY o.created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    // Получение всех заказов (для админа/менеджера)
    static async getAll() {
        const result = await pool.query(
            `SELECT o.*, u.name as user_name, u.email as user_email,
                COALESCE(
                    (SELECT json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price_at_moment))
                     FROM order_items oi
                     JOIN products p ON oi.product_id = p.id
                     WHERE oi.order_id = o.id),
                    '[]'::json
                ) as items
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC`
        );
        return result.rows;
    }

    static async updateStatus(orderId, status) {
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, orderId]
        );
        return result.rows[0];
    }

    static async getStats() {
        const totalOrders = await pool.query('SELECT COUNT(*) FROM orders');
        const totalRevenue = await pool.query('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != $1', ['cancelled']);
        return {
            orders: parseInt(totalOrders.rows[0].count),
            revenue: parseFloat(totalRevenue.rows[0].total)
        };
    }
}

module.exports = Order;