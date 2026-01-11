const User = require('../models/User');
const UserCollection = require('../models/UserCollection');
const { getLimitsForUser, isUnlimited } = require('./subscriptionPlans');

const getCounts = async (userId) => {
  const col = await UserCollection.findOne({ userId }).lean();
  return {
    collection: Array.isArray(col?.collection) ? col.collection.length : 0,
    wishlist: Array.isArray(col?.favorites) ? col.favorites.length : 0,
  };
};

/**
 * Verifica se o usuário pode adicionar mais itens.
 * @param {'collection'|'wishlist'} kind
 */
const assertCanAdd = async ({ userId, kind }) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    const err = new Error('Usuário não encontrado');
    err.status = 404;
    throw err;
  }

  const limits = getLimitsForUser(user);
  const max = limits?.limits?.[kind];
  if (isUnlimited(max)) return { ok: true, max: null, used: null, planId: limits.planId };

  const counts = await getCounts(userId);
  const used = counts[kind] || 0;

  if (used >= max) {
    const err = new Error(
      kind === 'collection'
        ? `Limite do seu plano atingido (${max}). Faça upgrade para adicionar mais itens na coleção.`
        : `Limite do seu plano atingido (${max}). Faça upgrade para adicionar mais itens na lista de desejos.`
    );
    err.status = 403;
    err.code = 'PLAN_LIMIT_REACHED';
    err.details = { kind, max, used, planId: limits.planId };
    throw err;
  }

  return { ok: true, max, used, planId: limits.planId };
};

module.exports = { assertCanAdd };
