const axios = require('axios');

const ABACATEPAY_API_BASE = process.env.ABACATEPAY_API_BASE || 'https://api.abacatepay.com/v1';

const getAbacateHeaders = () => {
  const token = process.env.ABACATEPAY_API_KEY;
  if (!token) {
    const err = new Error('ABACATEPAY_API_KEY não configurada no servidor.');
    err.code = 'ABACATEPAY_MISSING_KEY';
    throw err;
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const createBilling = async ({ products, returnUrl, completionUrl, externalId, metadata }) => {
  const url = `${ABACATEPAY_API_BASE}/billing/create`;

  const payload = {
    frequency: 'ONE_TIME',
    methods: ['PIX'],
    products,
    returnUrl,
    completionUrl,
    externalId,
    metadata: metadata || {},
  };

  try {
    const res = await axios.post(url, payload, { headers: getAbacateHeaders() });
    return res?.data?.data;
  } catch (err) {
    const providerStatus = err?.response?.status;
    const providerData = err?.response?.data;

    // Tenta extrair uma mensagem "humana" do provedor
    const providerMessage =
      providerData?.message ||
      providerData?.error ||
      providerData?.errors?.[0]?.message ||
      (typeof providerData === 'string' ? providerData : null);

    const e = new Error(
      providerStatus
        ? `AbacatePay respondeu ${providerStatus}: ${providerMessage || 'requisio invlida'}`
        : (err?.message || 'Erro ao chamar AbacatePay')
    );

    // Para o router decidir como responder
    e.status = 502;
    e.providerStatus = providerStatus;
    e.providerData = providerData;
    throw e;
  }
};

const listBillings = async () => {
  const url = `${ABACATEPAY_API_BASE}/billing/list`;
  const res = await axios.get(url, { headers: getAbacateHeaders() });
  return Array.isArray(res?.data?.data) ? res.data.data : [];
};

const findBillingById = async (billingId) => {
  const list = await listBillings();
  const id = String(billingId || '');
  return list.find((b) => String(b?.id) === id) || null;
};

module.exports = {
  createBilling,
  listBillings,
  findBillingById,
};
