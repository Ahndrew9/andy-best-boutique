const express = require('express');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 1. CLOUDINARY CONFIGURATION (INPUT YOUR KEYS)
// ==========================================
cloudinary.config({
    cloud_name: 'djz9ghgqg',
    api_key: '385325777612519',
    api_secret: 'KxFXynhbLZI0HTQjzAHMbuxwQCg'
});

// ==========================================
// 2. SUPABASE CONNECTION PARAMETERS (INPUT YOUR DETAILS)
// ==========================================
// ==========================================
// 2. SUPABASE CONNECTION STRING
// ==========================================
const pool = new Pool({
    connectionString: 'postgresql://postgres.cvnnjqayspcqovtnjhrz:United_lukaku9@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: { rejectUnauthorized: false }
});

// Setup temporary folder for image processing
const uploadDir = path.join(__dirname, 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: 'temp_uploads/' });

// Initialize Tables and Seed Initial Data if empty
async function initCloudDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price NUMERIC NOT NULL,
                description TEXT,
                image TEXT NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                orderNumber TEXT NOT NULL,
                items TEXT NOT NULL,
                total NUMERIC NOT NULL,
                status TEXT NOT NULL,
                date TEXT NOT NULL
            );
        `);

        const res = await pool.query('SELECT COUNT(*) FROM products');
        if (parseInt(res.rows[0].count) === 0) {
            const initialProducts = [
                { name: "Classic Slim Fit Jeans", category: "jeans", price: 22000, description: "Tailored slim-fit denim crafted from premium stretch cotton for all-day comfort and timeless style.", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=500&q=80" },
                { name: "Heavyweight Cotton Round Neck", category: "roundneck", price: 9500, description: "Luxurious heavyweight cotton tee designed for a structured, clean streetwear silhouette.", image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80" },
                { name: "Casual Fleece Joggers", category: "joggers", price: 18000, description: "Ultra-soft fleece joggers featuring an adjustable waistband and tapered ankles for maximum relaxation.", image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=500&q=80" },
                { name: "Urban Streetwear Slides", category: "slides", price: 12000, description: "Cushioned orthopedic slides built for effortless everyday wear and dependable poolside traction.", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80" },
                { name: "Relaxed Fit Denim Jeans", category: "jeans", price: 25000, description: "Vintage-washed relaxed denim offering a roomy feel and an effortlessly cool aesthetic.", image: "https://images.unsplash.com/photo-1542272604-787c96355d53?auto=format&fit=crop&w=500&q=80" },
                { name: "Essential White T-Shirt", category: "tshirts", price: 8500, description: "Breathable everyday cotton t-shirt tailored to maintain its crisp look wash after wash.", image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=500&q=80" },
                { name: "Summer Beach Shorts", category: "shorts", price: 11000, description: "Lightweight, quick-drying summer shorts designed for warm-weather excursions and casual lounging.", image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=500&q=80" },
                { name: "Classic Leather Sneakers", category: "shoes", price: 35000, description: "Sleek low-profile sneakers made with durable leather upper panels and cushioned insoles.", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=500&q=80" }
            ];

            for (let p of initialProducts) {
                await pool.query(
                    `INSERT INTO products (name, category, price, description, image) VALUES ($1, $2, $3, $4, $5)`,
                    [p.name, p.category, p.price, p.description, p.image]
                );
            }
            console.log('🌱 Seeded initial products into Supabase cloud database.');
        }
        console.log('☁️ Connected successfully to Supabase cloud database.');
    } catch (err) {
        console.error('Database initialization error:', err);
    }
}

initCloudDB();

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const ADMIN_PASSWORD = "voguevaultadmin2026";
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: "authorized_session_token" });
    } else {
        res.status(401).json({ success: false, message: "Incorrect password" });
    }
});

// Get Products
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Product
app.post('/api/products', upload.single('prodImage'), async (req, res) => {
    try {
        let imagePath = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80";

        if (req.file) {
            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                folder: 'andybest-products'
            });
            imagePath = uploadResult.secure_url;
            fs.unlinkSync(req.file.path);
        }

        const { name, category, price, description } = req.body;
        const cleanPrice = Number(price) || 0;
        const cleanDesc = description || "Crafted with high-end premium fabrics to guarantee absolute comfort, durability, and a clean streetwear aesthetic.";

        const query = `INSERT INTO products (name, category, price, description, image) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const result = await pool.query(query, [name, category, cleanPrice, cleanDesc, imagePath]);
        
        res.status(201).json({ success: true, product: result.rows[0] });
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

// Delete Product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Orders
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
        const formattedOrders = result.rows.map(o => ({
            ...o,
            items: JSON.parse(o.items)
        }));
        res.json(formattedOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Order
app.post('/api/orders', async (req, res) => {
    try {
        const { orderNumber, items, total, status } = req.body;
        const orderStatus = status || 'Pending';
        const dateStr = new Date().toLocaleString();
        const itemsJson = JSON.stringify(items);

        const query = `INSERT INTO orders (orderNumber, items, total, status, date) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const result = await pool.query(query, [orderNumber, itemsJson, total, orderStatus, dateStr]);
        
        res.status(201).json({ success: true, order: { ...result.rows[0], items } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Order Status
app.patch('/api/orders/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query('DELETE FROM orders WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 AndyBest Cloud Server running at: http://localhost:${PORT}`);
});