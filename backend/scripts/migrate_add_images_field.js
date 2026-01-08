/*
 Migration script to populate the new `images` array field for HotWheel documents.
 Usage (PowerShell):
   node ./scripts/migrate_add_images_field.js
*/

require('dotenv').config();
const mongoose = require('mongoose');
const HotWheel = require('../models/HotWheel');

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI (recommended) or MONGO_URI.');
  }
  await mongoose.connect(mongoUri);
  console.log('[migration] Connected to MongoDB');
  const cursor = HotWheel.find().cursor();
  let updated = 0, skipped = 0;
  for await (const doc of cursor) {
    if (Array.isArray(doc.images) && doc.images.length > 0) {
      // Ensure imageUrl is first element
      if (doc.imageUrl && doc.images[0] !== doc.imageUrl) {
        if (!doc.images.includes(doc.imageUrl)) {
          doc.images.unshift(doc.imageUrl);
        } else {
          // move to front
          doc.images = [doc.imageUrl, ...doc.images.filter(u => u !== doc.imageUrl)];
        }
        await doc.save();
        updated++;
      } else {
        skipped++;
      }
      continue;
    }
    if (doc.imageUrl) {
      doc.images = [doc.imageUrl];
      await doc.save();
      updated++;
      continue;
    }
    skipped++;
  }
  console.log(`[migration] Updated ${updated}, skipped ${skipped}`);
  await mongoose.disconnect();
  console.log('[migration] Done');
}

run().catch(e => {
  console.error('[migration] ERROR', e);
  process.exit(1);
});
