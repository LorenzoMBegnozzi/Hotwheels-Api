const express = require("express");
const authMiddleware = require("../middlewares/auth");
const UserCollection = require("../models/UserCollection");
const router = express.Router();
const mongoose = require("mongoose");

// Helper: extrai um id válido (24 hex) a partir de diferentes formatos de entrada
const extractFavoriteId = (f) => {
  if (!f) return null;

  // novo formato: { hotWheel: ObjectId | subdoc, priority }
  try {
    if (typeof f === 'object' && f.hotWheel) {
      const candidate = f.hotWheel && f.hotWheel._id ? f.hotWheel._id.toString() : String(f.hotWheel);
      if (mongoose.Types.ObjectId.isValid(candidate)) return candidate;
    }
  } catch (e) {
    // continue
  }

  // se já for um ObjectId ou string hex
  try {
    if (mongoose.Types.ObjectId.isValid(f)) return String(f);
  } catch (e) {}

  // se for subdocument antigo com _id
  try {
    if (f && typeof f === 'object' && f._id && mongoose.Types.ObjectId.isValid(f._id)) {
      return String(f._id);
    }
  } catch (e) {}

  // se for string que contenha apenas o hex
  try {
    if (typeof f === 'string') {
      // tentar parsear se for um objeto serializado
      try {
        const parsed = JSON.parse(f);
        return extractFavoriteId(parsed);
      } catch (e) {
        // não JSON - verificar se é um hex simples
        if (mongoose.Types.ObjectId.isValid(f)) return f;
      }
    }
  } catch (e) {}

  return null;
};

// Buscar wishlist de um usuário específico (sem autenticação necessária)
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("🔍 Buscando wishlist para usuário:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ ID do usuário inválido:", userId);
      return res.status(400).json({ msg: "ID inválido" });
    }

    // popular favorites.hotWheel para incluir dados do HotWheel junto com prioridade
    let userCollection = await UserCollection.findOne({ userId }).populate({
      path: "favorites.hotWheel",
      model: "HotWheel",
    });

    if (!userCollection) {
      console.warn("⚠️ Nenhuma coleção encontrada para o usuário:", userId);
      return res.status(200).json({ favorites: [] });
    }

    // transformar favorites para um array de objetos que mesclam hotWheel + priority
    // suportar formato antigo (Array<ObjectId>), novo (subdocument.hotWheel) e itens embutidos (HotWheel doc)
    const favorites = [];
    const missingIds = [];
    (userCollection.favorites || []).forEach((f) => {
      try {
        // novo formato: { hotWheel: ObjectId, priority }
        if (f && f.hotWheel) {
          const hw = f.hotWheel ? f.hotWheel.toObject() : null;
          if (hw) return favorites.push({ ...hw, priority: f.priority || 'medium' });
        }

        // caso já exista o documento HotWheel embutido (por exemplo quando favorites armazenava o objeto completo)
        if (f && typeof f === 'object' && (f.name || f.imageUrl || f.year)) {
          // tratar f como um HotWheel document
          return favorites.push({ ...f, priority: f.priority || 'medium' });
        }

        // caso seja apenas um id (ObjectId) ou string id
        const id = extractFavoriteId(f);
        if (id && mongoose.Types.ObjectId.isValid(id)) {
          missingIds.push(id);
        } else if (id) {
          console.warn('⚠️ Ignorando favorite id inválido ao construir missingIds:', id, f);
        }
      } catch (e) {
        // ignorar entradas inválidas
        console.warn('⚠️ Entrada inválida na wishlist encontrada e ignorada', f, e);
      }
    });

    if (missingIds.length > 0) {
      const HotWheel = mongoose.model('HotWheel');
      const missing = await HotWheel.find({ _id: { $in: missingIds } }).lean();
      const map = new Map(missing.map((m) => [m._id.toString(), m]));
      missingIds.forEach((id) => {
        const hw = map.get(id);
        if (hw) favorites.push({ ...hw, priority: 'medium' });
      });
    }

    console.log("✅ Enviando favoritos:", favorites);
    res.status(200).json({ favorites });
  } catch (error) {
    console.error("❌ Erro ao buscar wishlist:", error);
    res.status(500).json({ message: "Erro no servidor." });
  }
});

// Adicionar um Hot Wheel à lista de desejos (favoritos) do usuário
router.post("/", authMiddleware, async (req, res) => {
  const { hotWheelId, priority } = req.body;
  const userId = req.user.id;

  console.log("Recebendo requisição para adicionar à wishlist:", { userId, hotWheelId });

  if (!hotWheelId || !mongoose.Types.ObjectId.isValid(hotWheelId)) {
    return res.status(400).json({ message: "ID do Hot Wheel inválido" });
  }

  try {
    let userCollection = await UserCollection.findOne({ userId });

    if (!userCollection) {
      userCollection = new UserCollection({ userId, collection: [], favorites: [] });
    }

    // garantir que seja array
    if (!Array.isArray(userCollection.favorites)) userCollection.favorites = [];

    console.log('📋 Wishlist antes de adicionar:', userCollection._id ? userCollection._id.toString() : null, 'count=', userCollection.favorites.length);

    // verificar se já existe o hotWheel na wishlist (tolerante a vários formatos)
    const exists = userCollection.favorites.some((f) => extractFavoriteId(f) === String(hotWheelId));

    let addedFavorite = null;
    if (!exists) {
      userCollection.favorites.unshift({ hotWheel: hotWheelId, priority: priority || 'medium' });
      await userCollection.save();
      console.log('✅ Favorito adicionado ao documento userCollection', userCollection._id.toString());

      // popular apenas o hotWheel recém-adicionado para resposta
      await userCollection.populate({ path: 'favorites.hotWheel', model: 'HotWheel' });
      const first = userCollection.favorites[0];
      if (first && first.hotWheel) {
        const hw = first.hotWheel.toObject ? first.hotWheel.toObject() : first.hotWheel;
        addedFavorite = { ...hw, priority: first.priority || 'medium' };
      }
    } else {
      console.log('⚠️ HotWheel já existe na wishlist do usuário', userId, hotWheelId);
      // localizar a entrada existente para retornar
      await userCollection.populate({ path: 'favorites.hotWheel', model: 'HotWheel' });
      const found = userCollection.favorites.find((f) => extractFavoriteId(f) === String(hotWheelId));
      if (found && found.hotWheel) {
        const hw = found.hotWheel.toObject ? found.hotWheel.toObject() : found.hotWheel;
        addedFavorite = { ...hw, priority: found.priority || 'medium' };
      }
    }

    // reconstruir lista resumida para retorno (evitar passar subdocs inesperados)
    const favorites = [];
    (userCollection.favorites || []).forEach((f) => {
      try {
        if (f && f.hotWheel) {
          const hw = f.hotWheel.toObject ? f.hotWheel.toObject() : f.hotWheel;
          favorites.push({ ...hw, priority: f.priority || 'medium' });
        } else {
            const id = extractFavoriteId(f);
            if (id && mongoose.Types.ObjectId.isValid(id)) {
              favorites.push({ _id: id, priority: 'medium' });
            } else if (id) {
              console.warn('⚠️ Ignorando favorite id inválido ao reconstruir favorites:', id, f);
            }
          }
      } catch (e) {
        // ignore
      }
    });

    res.status(200).json({ message: 'Adicionado à lista de desejos!', favorite: addedFavorite, favorites });
  } catch (error) {
    console.error("Erro ao adicionar à lista de desejos:", error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

router.delete("/:carId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const carId = req.params.carId;
    console.log("🗑️ Removendo carro:", carId, "da wishlist do usuário:", userId);

    let userCollection = await UserCollection.findOne({ userId });

    if (!userCollection) {
      return res.status(404).json({ message: "Lista de desejos não encontrada." });
    }

    // Remover subdocumento cujo hotWheel corresponde ao id (tolerante a ObjectId antigo)
    userCollection.favorites = userCollection.favorites.filter((f) => {
      const id = extractFavoriteId(f);
      if (!id) return true; // keep if we can't determine
      return id !== carId.toString();
    });

    await userCollection.save();

    console.log("✅ Novo estado da wishlist:", userCollection.favorites);
    // popular antes de retornar
    await userCollection.populate({ path: "favorites.hotWheel", model: "HotWheel" });
    const favorites = [];
    const missingIds3 = [];
    (userCollection.favorites || []).forEach((f) => {
      const id = extractFavoriteId(f);
      if (f && f.hotWheel) {
        const hw = f.hotWheel ? f.hotWheel.toObject() : null;
        if (hw) favorites.push({ ...hw, priority: f.priority || 'medium' });
      } else if (id && mongoose.Types.ObjectId.isValid(id)) {
        missingIds3.push(id);
      } else if (id) {
        console.warn('⚠️ Ignorando favorite id inválido ao construir missingIds3:', id, f);
      }
    });
    if (missingIds3.length > 0) {
      const HotWheel = mongoose.model('HotWheel');
      const missing = await HotWheel.find({ _id: { $in: missingIds3 } }).lean();
      const map = new Map(missing.map((m) => [m._id.toString(), m]));
      missingIds3.forEach((id) => {
        const hw = map.get(id);
        if (hw) favorites.push({ ...hw, priority: 'medium' });
      });
    }

    res.status(200).json({ message: "Item removido com sucesso.", favorites });
  } catch (error) {
    console.error("❌ Erro ao remover item da wishlist:", error);
    if (error && error.stack) console.error(error.stack);
    // Em desenvolvimento, retornar stack/mensagem completa auxilia debug localmente
    res.status(500).json({ message: error.message || "Erro no servidor.", stack: error.stack });
  }
});


router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("🔍 Buscando wishlist para usuário:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ ID do usuário inválido:", userId);
      return res.status(400).json({ msg: "ID inválido" });
    }

    // popular favorites.hotWheel para incluir dados do HotWheel junto com prioridade
    let userCollection = await UserCollection.findOne({ userId }).populate({
      path: "favorites.hotWheel",
      model: "HotWheel",
    });

    if (!userCollection) {
      console.warn("⚠️ Nenhuma coleção encontrada para o usuário:", userId);
      return res.status(404).json({ message: "Lista de desejos não encontrada." });
    }

    const favorites = (userCollection.favorites || []).map((f) => {
      const hw = f.hotWheel ? f.hotWheel.toObject() : null;
      return hw ? { ...hw, priority: f.priority || "medium" } : null;
    }).filter(Boolean);

    console.log("✅ Enviando favoritos:", favorites);
    res.status(200).json({ favorites });
  } catch (error) {
    console.error("❌ Erro ao buscar wishlist:", error);
    res.status(500).json({ message: "Erro no servidor." });
  }
});

// Atualizar prioridade de um item da wishlist
router.put('/:carId/priority', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const carId = req.params.carId;
    const { priority } = req.body;

    if (!['high','medium','low'].includes(priority)) {
      return res.status(400).json({ message: 'Prioridade inválida' });
    }

    let userCollection = await UserCollection.findOne({ userId });
    if (!userCollection) return res.status(404).json({ message: 'Lista de desejos não encontrada.' });

    // localizar índice do favorito tolerante a ambos formatos
    const idx = userCollection.favorites.findIndex((f) => extractFavoriteId(f) === String(carId));

    if (idx === -1) return res.status(404).json({ message: 'Item não encontrado na wishlist.' });

    const entry = userCollection.favorites[idx];
    // se formato antigo (ObjectId), converter para subdocumento com prioridade
    if (!entry.hotWheel) {
      const originalId = entry.toString();
      userCollection.favorites[idx] = { hotWheel: originalId, priority };
    } else {
      userCollection.favorites[idx].priority = priority;
    }

    await userCollection.save();

    await userCollection.populate({ path: 'favorites.hotWheel', model: 'HotWheel' });
    // localizar novamente a entrada populada
    const updated = userCollection.favorites.find((f) => (f.hotWheel ? f.hotWheel._id.toString() : f.toString()) === carId.toString());
    const hw = updated && updated.hotWheel ? updated.hotWheel.toObject() : null;
    res.status(200).json({ favorite: hw ? { ...hw, priority: updated.priority } : null });
  } catch (error) {
    console.error('❌ Erro ao atualizar prioridade:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});


module.exports = router;