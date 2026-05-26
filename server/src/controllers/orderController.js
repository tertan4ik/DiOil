const pool = require('../config/db'); // импорт подключения к БД
const Order = require('../models/Order');
const Cart = require('../models/Cart');

exports.createOrder = async (req, res) => {
    const { deliveryType, deliveryAddress, paymentMethod, items, total } = req.body;
    
    // Валидация
    if (!deliveryType || !['courier', 'pickup'].includes(deliveryType)) {
        return res.status(400).json({ error: 'Неверный тип доставки' });
    }
    let finalAddress = deliveryAddress;
    if (deliveryType === 'pickup') {
        // Получаем фиксированный адрес из настроек
        const settings = await pool.query('SELECT value FROM settings WHERE key = $1', ['pickup_address']);
        finalAddress = settings.rows[0]?.value || 'г. Екатеринбург, ул. Токарей, 45';
    } else if (!finalAddress) {
        return res.status(400).json({ error: 'Укажите адрес доставки' });
    }
    
    // Проверка на пустую корзину
    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Корзина пуста' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Создаём заказ
        const orderResult = await client.query(
            `INSERT INTO orders (user_id, total, delivery_address, payment_method, delivery_type)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.id, total, finalAddress, paymentMethod, deliveryType]
        );
        
        // Добавляем позиции
        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_moment)
                 VALUES ($1, $2, $3, $4)`,
                [orderResult.rows[0].id, item.productId, item.quantity, item.price]
            );
        }
        
        // Очищаем корзину
        await client.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);
        
        await client.query('COMMIT');
        res.status(201).json(orderResult.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка создания заказа:', err);
        res.status(500).json({ error: 'Ошибка создания заказа', details: err.message });
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