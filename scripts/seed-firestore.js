const admin = require('firebase-admin');

// Initialize admin SDK with your project
const serviceAccount = require('../path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'goodyard-qouteflow'
});

const db = admin.firestore();

// Import the mock data - we need to use the compiled JS version
const { MOCK_USERS, MOCK_RFQS } = require('../src/lib/data.js');

async function seedDatabase() {
  try {
    // Seed users
    console.log('Seeding users...');
    const userPromises = MOCK_USERS.map(user => 
      db.collection('users').doc(user.id).set(user)
    );
    await Promise.all(userPromises);
    console.log(`✓ Seeded ${MOCK_USERS.length} users`);
    
    // Seed RFQs
    console.log('Seeding RFQs...');
    const rfqPromises = MOCK_RFQS.map(rfq => 
      db.collection('rfqs').doc(rfq.id).set(rfq)
    );
    await Promise.all(rfqPromises);
    console.log(`✓ Seeded ${MOCK_RFQS.length} RFQs`);
    
    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();