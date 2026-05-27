const pool = require('../config/db');

exports.getUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, phone, role, created_at FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки пользователей' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;
        const result = await pool.query(
            'UPDATE users SET name=$1, email=$2, phone=$3, role=$4 WHERE id=$5 RETURNING id, name, email, phone, role',
            [name, email, phone, role, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка обновления пользователя' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка удаления пользователя' });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await pool.query(
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
        res.json(orders.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const result = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const totalProducts = await pool.query('SELECT COUNT(*) FROM products WHERE is_archived = false');
        const totalOrders = await pool.query('SELECT COUNT(*) FROM orders');
        const totalRevenue = await pool.query('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != $1', ['cancelled']);
        const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
        
        // Средний чек (если есть заказы)
        let avgOrder = 0;
        const ordersCount = parseInt(totalOrders.rows[0].count);
        if (ordersCount > 0) {
            avgOrder = parseFloat(totalRevenue.rows[0].total) / ordersCount;
        }
        
        // Можно также добавить количество заказов за текущий месяц
        const currentMonthOrders = await pool.query(
            `SELECT COUNT(*) FROM orders WHERE created_at >= date_trunc('month', CURRENT_DATE)`
        );
        
        res.json({
            products: parseInt(totalProducts.rows[0].count),
            orders: ordersCount,
            revenue: parseFloat(totalRevenue.rows[0].total),
            users: parseInt(totalUsers.rows[0].count),
            avgOrder: Math.round(avgOrder * 100) / 100,
            ordersThisMonth: parseInt(currentMonthOrders.rows[0].count)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки статистики' });
    }

    
};

// server/src/controllers/adminController.js (добавьте в конец файла)
exports.getAdvancedStats = async (req, res) => {
    try {
        // 1. Общая статистика
        const totalProducts = await pool.query('SELECT COUNT(*) FROM products WHERE is_archived = false');
        const totalOrders = await pool.query('SELECT COUNT(*) FROM orders');
        const totalRevenue = await pool.query('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != $1', ['cancelled']);
        const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
        
        const avgOrder = totalOrders.rows[0].count > 0 
            ? totalRevenue.rows[0].total / totalOrders.rows[0].count 
            : 0;

        // 2. Заказы по дням (последние 30 дней)
        const ordersByDay = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        // 3. Топ-5 товаров по количеству продаж
        const topProducts = await pool.query(`
            SELECT p.id, p.name, SUM(oi.quantity) as total_quantity, SUM(oi.price_at_moment * oi.quantity) as total_revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            GROUP BY p.id, p.name
            ORDER BY total_quantity DESC
            LIMIT 5
        `);
        
        // 4. Заказы по статусам
        const ordersByStatus = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM orders
            GROUP BY status
        `);
        
        res.json({
            summary: {
                products: parseInt(totalProducts.rows[0].count),
                orders: parseInt(totalOrders.rows[0].count),
                revenue: parseFloat(totalRevenue.rows[0].total),
                users: parseInt(totalUsers.rows[0].count),
                avgOrder: Math.round(avgOrder * 100) / 100
            },
            ordersByDay: ordersByDay.rows,
            topProducts: topProducts.rows,
            ordersByStatus: ordersByStatus.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки статистики' });
    }
};