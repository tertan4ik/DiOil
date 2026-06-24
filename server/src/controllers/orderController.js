const pool = require('../config/db'); // импорт подключения к БД
const Order = require('../models/Order');
const Cart = require('../models/Cart');

exports.createOrder = async (req, res) => {
    const { deliveryType, deliveryAddress, paymentMethod, items, total } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Проверка остатков и временное резервирование
        for (const item of items) {
            const stockCheck = await client.query(
                'SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE',
                [item.productId]
            );
            if (stockCheck.rows.length === 0) {
                throw new Error(`Товар с ID ${item.productId} не найден`);
            }
            const currentStock = stockCheck.rows[0].stock_quantity;
            if (currentStock < item.quantity) {
                throw new Error(`Недостаточно товара (ID ${item.productId}). Доступно: ${currentStock}`);
            }
        }

        // 2. Списание остатков
        for (const item of items) {
            await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.productId]
            );
        }

        // 3. Создание заказа
        let finalAddress = deliveryAddress;
        if (deliveryType === 'pickup') {
            const settings = await client.query('SELECT value FROM settings WHERE key = $1', ['pickup_address']);
            finalAddress = settings.rows[0]?.value || 'г. Екатеринбург, ул. Токарей, 45';
        }

        const orderResult = await client.query(
            `INSERT INTO orders (user_id, total, delivery_address, payment_method, delivery_type)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.id, total, finalAddress, paymentMethod, deliveryType]
        );

        // 4. Запись позиций заказа
        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_moment)
                 VALUES ($1, $2, $3, $4)`,
                [orderResult.rows[0].id, item.productId, item.quantity, item.price]
            );
        }

        // 5. Очистка корзины
        await client.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);

        await client.query('COMMIT');
        res.json(orderResult.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка создания заказа:', err);
        res.status(400).json({ error: err.message || 'Ошибка оформления заказа' });
    } finally {
        client.release();
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.getByUser(req.user.id);
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
};