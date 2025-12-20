// scripts/migrate_wishlist_format.js
const mongoose = require('mongoose');
require('dotenv').config();

const UserCollection = require('../models/UserCollection');
const HotWheel = require('../models/HotWheel');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Conectado ao MongoDB para migração');

  const all = await UserCollection.find({});
  console.log('Found', all.length, 'user collections');

  for (const uc of all) {
    let modified = false;
    const newFavorites = [];

    for (const f of uc.favorites) {
      // se já é subdocumento com hotWheel, manter
      if (f && f.hotWheel) {
        newFavorites.push(f);
        continue;
      }

      // se for ObjectId (ou string) -> converter para subdoc
      try {
        const id = f && f._id ? (f._id.toString ? f._id.toString() : f._id) : (f.toString ? f.toString() : null);
        if (id && mongoose.Types.ObjectId.isValid(id)) {
          newFavorites.push({ hotWheel: id, priority: 'medium' });
          modified = true;
          continue;
        }
      } catch (e) {}

      // se já for um objeto HotWheel embutido -> tentar encontrar seu _id
      if (f && f._id) {
        const id = f._id.toString ? f._id.toString() : null;
        if (id && mongoose.Types.ObjectId.isValid(id)) {
          newFavorites.push({ hotWheel: id, priority: f.priority || 'medium' });
          modified = true;
          continue;
        }
      }

      // fallback: ignorar
      console.warn('Ignorando favorito não reconhecido para userCollection', uc._id, f);
    }

    if (modified) {
      uc.favorites = newFavorites;
      await uc.save();
      console.log('Atualizada userCollection', uc._id);
    }
  }

  console.log('Migração finalizada');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Erro na migração', err);
  process.exit(1);
});
