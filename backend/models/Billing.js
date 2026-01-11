const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: String, required: true },
    amountCents: { type: Number, required: true },

    provider: { type: String, default: 'abacatepay' },
    providerBillingId: { type: String, required: true, index: true },
    checkoutUrl: { type: String, default: null },

    status: { type: String, default: 'PENDING' },
    devMode: { type: Boolean, default: false },

    externalId: { type: String, default: null },
    metadata: { type: Object, default: {} },

    paidAt: { type: Date, default: null },
    lastEventId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Billing', BillingSchema);
