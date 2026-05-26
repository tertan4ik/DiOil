const express = require('express');
const { getBrands } = require('../controllers/brandController');

const router = express.Router();
router.get('/', getBrands);

module.exports = router;