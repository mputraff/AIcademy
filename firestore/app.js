import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Import service account key
import serviceAccount from './nama_keys_firestore.json' assert { type: 'json' };

// Inisialisasi Firestore
initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

const app = express();
app.use(express.json());

// Endpoint untuk menambahkan data ke Firestore
app.post('/add', async (req, res) => {
    try {
        const { collection, data } = req.body;
        const result = await db.collection(collection).add(data);
        res.status(200).json({ message: 'Data added successfully', id: result.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint untuk mengambil semua data dari koleksi
app.get('/get/:collection', async (req, res) => {
    try {
        const { collection } = req.params;
        const snapshot = await db.collection(collection).get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

