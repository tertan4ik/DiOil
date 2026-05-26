const Brand = require('../models/Brand');

exports.getBrands = async (req, res) => {
    try {
        const brands = await Brand.getAll();
        res.json(brands);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки брендов' });
    }
};