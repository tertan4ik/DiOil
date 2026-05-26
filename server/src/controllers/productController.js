const pool = require('../config/db');
// Unit, Brand больше не нужны для getOrCreate, так как используем прямые id
// const Unit = require('../models/Unit');
// const Brand = require('../models/Brand');

// Публичные методы
exports.getProducts = async (req, res) => {
    try {
        const { category, search, inStock } = req.query;
        let query = `
            SELECT p.*, u.name as unit_name, b.name as brand_name, p.quantity_per_pack
            FROM products p
            LEFT JOIN units u ON p.unit_id = u.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.is_archived = false
        `;
        const params = [];
        if (category && category !== 'all') {
            params.push(category);
            query += ` AND p.category_id = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND p.name ILIKE $${params.length}`;
        }
        if (inStock === 'true') {
            query += ' AND p.stock_quantity > 0';
        }
        query += ' ORDER BY p.id';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки товаров' });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, u.name as unit_name, b.name as brand_name, p.quantity_per_pack
             FROM products p
             LEFT JOIN units u ON p.unit_id = u.id
             LEFT JOIN brands b ON p.brand_id = b.id
             WHERE p.id = $1`,
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Товар не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки товара' });
    }
};

// Админские методы
exports.getAllProductsAdmin = async (req, res) => {
    try {
        const { category, search, inStock, archived } = req.query;
        let query = `
            SELECT p.*, u.name as unit_name, b.name as brand_name
            FROM products p
            LEFT JOIN units u ON p.unit_id = u.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE 1=1
        `;
        const params = [];
        if (category && category !== 'all') {
            params.push(category);
            query += ` AND p.category_id = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND p.name ILIKE $${params.length}`;
        }
        if (inStock === 'true') {
            query += ' AND p.stock_quantity > 0';
        }
        if (archived === 'true') {
            query += ' AND p.is_archived = true';
        } else if (archived === 'false') {
            query += ' AND p.is_archived = false';
        }
        query += ' ORDER BY p.id';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки товаров' });
    }
};

exports.createProduct = async (req, res) => {
    try {
        // Поля приходят в snake_case: unit_id, brand_id, category_id, stock_quantity, quantity_per_pack
        const { name, sku, category_id, price, unit_id, brand_id, stock_quantity, quantity_per_pack, description, image } = req.body;
        
        // Валидация обязательных полей
        if (!unit_id) return res.status(400).json({ error: 'Единица измерения обязательна' });
        if (!category_id) return res.status(400).json({ error: 'Категория обязательна' });
        
        const result = await pool.query(
            `INSERT INTO products (name, sku, category_id, price, unit_id, brand_id, stock_quantity, quantity_per_pack, description, image)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [name, sku, category_id, price, unit_id, brand_id, stock_quantity, quantity_per_pack, description, image]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка добавления товара' });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { name, sku, category_id, price, unit_id, brand_id, stock_quantity, quantity_per_pack, description, image, is_archived } = req.body;
        const fields = [];
        const values = [];
        let idx = 1;
        if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
        if (sku !== undefined) { fields.push(`sku = $${idx++}`); values.push(sku); }
        if (category_id !== undefined) { fields.push(`category_id = $${idx++}`); values.push(category_id); }
        if (price !== undefined) { fields.push(`price = $${idx++}`); values.push(price); }
        if (unit_id !== undefined) { fields.push(`unit_id = $${idx++}`); values.push(unit_id); }
        if (brand_id !== undefined) { fields.push(`brand_id = $${idx++}`); values.push(brand_id); }
        if (stock_quantity !== undefined) { fields.push(`stock_quantity = $${idx++}`); values.push(stock_quantity); }
        if (quantity_per_pack !== undefined) { fields.push(`quantity_per_pack = $${idx++}`); values.push(quantity_per_pack); }
        if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
        if (image !== undefined) { fields.push(`image = $${idx++}`); values.push(image); }
        if (is_archived !== undefined) { fields.push(`is_archived = $${idx++}`); values.push(is_archived); }
        if (fields.length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });
        values.push(req.params.id);
        const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
        const result = await pool.query(query, values);
        if (!result.rows.length) return res.status(404).json({ error: 'Товар не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка обновления товара' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await pool.query('UPDATE products SET is_archived = true WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка архивирования товара' });
    }
};

exports.restoreProduct = async (req, res) => {
    try {
        await pool.query('UPDATE products SET is_archived = false WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка восстановления товара' });
    }
};