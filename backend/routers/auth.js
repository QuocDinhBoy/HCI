import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const normalizeText = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

router.post('/register', async (req, res) => {
    const username = normalizeText(req.body?.username);
    const parent_name = normalizeText(req.body?.parent_name);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui long nhap ten be, email va mat khau.' });
    }

    if (username.length < 2 || username.length > 80) {
        return res.status(400).json({ message: 'Ten cua be can tu 2 den 80 ky tu.' });
    }

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'Email khong hop le.' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ message: `Mat khau phai co it nhat ${MIN_PASSWORD_LENGTH} ky tu.` });
    }

    try {
        const [existingUsers] = await db.execute('SELECT id FROM user WHERE email = ? LIMIT 1', [email]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Email nay da duoc su dung.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.execute(
            'INSERT INTO user (username, parent_name, email, password) VALUES (?, ?, ?, ?)',
            [username, parent_name || '', email, hashedPassword]
        );

        res.status(201).json({ message: 'Dang ky thanh cong! Chao mung be den voi ung dung.' });
    } catch (error) {
        if (error?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email nay da duoc su dung.' });
        }
        console.error('Loi dang ky:', error);
        res.status(500).json({ message: 'Loi he thong, vui long thu lai sau.' });
    }
});

router.post('/login', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
        return res.status(400).json({ message: 'Vui long nhap email va mat khau.' });
    }

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'Email khong hop le.' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('Thieu JWT_SECRET trong moi truong');
        return res.status(500).json({ message: 'He thong xac thuc chua duoc cau hinh.' });
    }

    try {
        const [users] = await db.execute('SELECT * FROM user WHERE email = ? LIMIT 1', [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Email hoac mat khau khong dung.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoac mat khau khong dung.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Dang nhap thanh cong',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                parent_name: user.parent_name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Loi server khi dang nhap.' });
    }
});

export default router;