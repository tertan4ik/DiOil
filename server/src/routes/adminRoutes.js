const express = require('express');
const authenticateToken = require('../middleware/auth');
const { isAdmin, isAdminOrManager } = require('../middleware/roleCheck');
const { getUsers, updateUser, deleteUser, getAllOrders, updateOrderStatus, getStats,getAdvancedStats } = require('../controllers/adminController');
const { getAllProductsAdmin, createProduct, updateProduct, deleteProduct, restoreProduct } = require('../controllers/productController');
// ... внутри после других маршрутов

const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db'); // для физического удаления
const bcrypt = require('bcrypt');
const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticateToken);
// ========== ТОВАРЫ ==========
router.get('/products', isAdminOrManager, getAllProductsAdmin);
router.post('/products', isAdminOrManager, createProduct);
router.put('/products/:id', isAdminOrManager, updateProduct);
router.delete('/products/:id', isAdminOrManager, deleteProduct); // архивирование
// server/src/routes/adminRoutes.js
router.get('/stats/advanced', isAdminOrManager, getAdvancedStats);

// ...

router.put('/users/:id', isAdmin, async (req, res) => {
    const { name, email, phone, role, newPassword } = req.body;
    let updateQuery = 'UPDATE users SET name=$1, email=$2, phone=$3, role=$4';
    const values = [name, email, phone, role];
    let idx = 5;
    if (newPassword && newPassword.trim() !== '') {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateQuery += `, password = $${idx++}`;
        values.push(hashedPassword);
    }
    updateQuery += ` WHERE id = $${idx++} RETURNING id, name, email, phone, role`;
    values.push(req.params.id);
    try {
        const result = await pool.query(updateQuery, values);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка обновления пользователя' });
    }
});

// ========== ИЗОБРАЖЕНИЯ ==========
router.post('/upload-image', isAdminOrManager, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    res.json({ imageUrl: `/home/c500931/dioil.na4u.ru/app/public/images/${req.file.filename}`, fileName: req.file.filename });
});

router.delete('/delete-image', isAdminOrManager, (req, res) => {
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ error: 'Имя файла не указано' });
    // Абсолютный путь к папке public/images вашего приложения
    const filePath = '/home/c500931/dioil.na4u.ru/app/public/images/' + fileName;
    fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка удаления файла' });
        }
        res.json({ success: true });
    });
});
const isProductInOrders = async (productId) => {
    const result = await pool.query('SELECT id FROM order_items WHERE product_id = $1 LIMIT 1', [productId]);
    return result.rows.length > 0;
};
// Физическое удаление товара (только админ)
router.delete('/products/:id/permanent', isAdmin, async (req, res) => {
    const productId = req.params.id;
    const client = await pool.connect();
    try {
        if (await isProductInOrders(productId)) {
            return res.status(400).json({ error: 'Нельзя удалить товар, который есть в заказах' });
        }
        await client.query('BEGIN');
        await client.query('DELETE FROM cart WHERE product_id = $1', [productId]);
        await client.query('DELETE FROM favorites WHERE product_id = $1', [productId]);
        const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING id', [productId]);
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Товар не найден' });
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Товар полностью удалён' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Ошибка удаления товара' });
    } finally {
        client.release();
    }
});

// Архивирование товара (мягкое удаление) – доступно админу и менеджеру
router.delete('/products/:id', isAdminOrManager, async (req, res) => {
    const productId = req.params.id;
    try {
        // При архивации товар не должен быть в корзинах и избранном пользователей
        await pool.query('DELETE FROM cart WHERE product_id = $1', [productId]);
        await pool.query('DELETE FROM favorites WHERE product_id = $1', [productId]);
        // Устанавливаем флаг is_archived = true
        const result = await pool.query('UPDATE products SET is_archived = true WHERE id = $1 RETURNING id', [productId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json({ success: true, message: 'Товар архивирован' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка архивации товара' });
    }
});
// Добавить в существующий файл после маршрутов заказов

// Удаление заказа (только админ)
router.delete('/orders/:id', isAdmin, async (req, res) => {
    try {
        // Проверяем, существует ли заказ
        const orderExists = await pool.query('SELECT id FROM orders WHERE id = $1', [req.params.id]);
        if (orderExists.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        // Удаляем связанные записи в order_items (каскадно)
        await pool.query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
        await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка удаления заказа' });
    }
});

// Изменение состава заказа (только админ)
router.put('/orders/:id/items', isAdmin, async (req, res) => {
    const { items } = req.body; // items: [{ productId, quantity, price }]
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Неверный формат данных' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Удаляем старые позиции
        await client.query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
        // Вставляем новые
        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_moment)
                 VALUES ($1, $2, $3, $4)`,
                [req.params.id, item.productId, item.quantity, item.price]
            );
        }
        // Пересчитываем общую сумму заказа
        const totalRes = await client.query(
            'SELECT SUM(quantity * price_at_moment) as total FROM order_items WHERE order_id = $1',
            [req.params.id]
        );
        const newTotal = totalRes.rows[0].total;
        await client.query('UPDATE orders SET total = $1 WHERE id = $2', [newTotal, req.params.id]);
        await client.query('COMMIT');
        res.json({ success: true, total: newTotal });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Ошибка обновления состава заказа' });
    } finally {
        client.release();
    }
});
// ========== ПОЛЬЗОВАТЕЛИ (только админ) ==========
router.get('/users', isAdmin, getUsers);
router.put('/users/:id', isAdmin, updateUser);
router.delete('/users/:id', isAdmin, deleteUser);

// ========== ЗАКАЗЫ ==========
router.get('/orders', isAdminOrManager, getAllOrders);
router.put('/orders/:id/status', isAdminOrManager, updateOrderStatus);

// ========== СТАТИСТИКА ==========
router.get('/stats', isAdminOrManager, getStats);

module.exports = router;