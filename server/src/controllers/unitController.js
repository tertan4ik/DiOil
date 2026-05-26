const Unit = require('../models/Unit');

exports.getUnits = async (req, res) => {
    try {
        const units = await Unit.getAll();
        res.json(units);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки единиц измерения' });
    }
};