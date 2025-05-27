// Firebase Collections Setup Script
// Jalankan script ini untuk membuat semua collections yang diperlukan

import { db } from './src/config/firebaseConfig'; // Sesuaikan path dengan struktur project Anda
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

const setupFirebaseCollections = async () => {
  try {
    console.log('Setting up Firebase collections...');

    // 1. Setup Orders Collections untuk setiap kantin
    const kantins = ['a', 'b', 'c', 'd'];
    
    for (const kantin of kantins) {
      const collectionName = `orders_kantin_${kantin}`;
      
      // Buat dummy document untuk inisialisasi collection
      const dummyData = {
        dummy: true,
        message: `Collection for Kantin ${kantin.toUpperCase()} orders`,
        createdAt: new Date(),
        kantin: kantin.toUpperCase()
      };
      
      await addDoc(collection(db, collectionName), dummyData);
      console.log(`✅ Collection ${collectionName} created successfully`);
    }

    // 2. Setup general orders collection (untuk super admin)
    const generalOrdersDummy = {
      dummy: true,
      message: 'General orders collection for super admin',
      createdAt: new Date()
    };
    
    await addDoc(collection(db, 'orders'), generalOrdersDummy);
    console.log('✅ General orders collection created successfully');

    // 3. Setup admin users collection (opsional)
    const adminData = [
      {
        id: 'admin_kantin_a',
        email: 'admin.a@kantin.com',
        role: 'kantin_admin',
        kantin: 'A',
        name: 'Admin Kantin A'
      },
      {
        id: 'admin_kantin_b', 
        email: 'admin.b@kantin.com',
        role: 'kantin_admin',
        kantin: 'B',
        name: 'Admin Kantin B'
      },
      {
        id: 'admin_kantin_c',
        email: 'admin.c@kantin.com', 
        role: 'kantin_admin',
        kantin: 'C',
        name: 'Admin Kantin C'
      },
      {
        id: 'admin_kantin_d',
        email: 'admin.d@kantin.com',
        role: 'kantin_admin', 
        kantin: 'D',
        name: 'Admin Kantin D'
      },
      {
        id: 'super_admin',
        email: 'superadmin@kantin.com',
        role: 'super_admin',
        kantin: 'all',
        name: 'Super Admin'
      }
    ];

    for (const admin of adminData) {
      await setDoc(doc(db, 'admins', admin.id), admin);
      console.log(`✅ Admin ${admin.name} created successfully`);
    }

    console.log('\n🎉 Firebase setup completed successfully!');
    console.log('\nCollections created:');
    console.log('- orders_kantin_a');
    console.log('- orders_kantin_b'); 
    console.log('- orders_kantin_c');
    console.log('- orders_kantin_d');
    console.log('- orders (general)');
    console.log('- admins');
    
    console.log('\n⚠️  Note: Hapus dummy documents setelah ada data real!');

  } catch (error) {
    console.error('❌ Error setting up Firebase collections:', error);
  }
};

// Uncomment line di bawah untuk menjalankan setup
// setupFirebaseCollections();

export default setupFirebaseCollections;

/* 
CARA PENGGUNAAN:

1. Import script ini di file yang bisa dijalankan (misalnya App.js atau component lain)
2. Panggil setupFirebaseCollections() saat aplikasi pertama kali dijalankan
3. Atau buat file terpisah dan jalankan sekali saja

Contoh di App.js:
```javascript
import setupFirebaseCollections from './setupFirebase';

// Panggil sekali saja saat development
useEffect(() => {
  // setupFirebaseCollections(); // Uncomment untuk setup
}, []);
```

ATAU buat file setup.js terpisah:
```javascript
import setupFirebaseCollections from './setupFirebase';
setupFirebaseCollections();
```

Lalu jalankan: node setup.js
*/