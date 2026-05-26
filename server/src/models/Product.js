const pool = require('../config/db');

class Product {
    static async findAll(filters = {}) {
        const { category, search, inStock } = filters;
        let query = `
            SELECT p.*, u.name as unit_name, b.name as brand_name,p.quantity_per_pack
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
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT p.*, u.name as unit_name, b.name as brand_name,p.quantity_per_pack
             FROM products p
             LEFT JOIN units u ON p.unit_id = u.id
             LEFT JOIN brands b ON p.brand_id = b.id
             WHERE p.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async create(data) {
        const { name, sku, category_id, price, unit_id, brand_id, stock_quantity, quantity_per_pack, description, image } = data;
        const result = await pool.query(
            `INSERT INTO products (name, sku, category_id, price, unit_id, brand_id, stock_quantity, quantity_per_pack, description, image)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [name, sku, category_id, price, unit_id, brand_id, stock_quantity, quantity_per_pack, description, image]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, val] of Object.entries(data)) {
            if (val !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(val);
                idx++;
            }
        }
        if (fields.length === 0) return null;
        values.push(id);
        const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async archive(id) {
        await pool.query('UPDATE products SET is_archived = true WHERE id = $1', [id]);
    }
}

module.exports = Product;