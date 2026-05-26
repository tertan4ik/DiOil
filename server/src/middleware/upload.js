const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Абсолютный путь к папке public/images на хостинге
const uploadDir = '/home/c500931/dioil.na4u.ru/app/public/images';

// Создаём папку, если её нет
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Только изображения!'));
    }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;