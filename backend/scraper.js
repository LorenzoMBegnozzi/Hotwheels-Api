const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const HotWheel = require('./models/HotWheel');

mongoose.connect('mongodb://127.0.0.1:27017/hotwheels')
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Base URL
const baseURL = 'https://hotwheels.fandom.com';

// Array de links para testar (fornecendo links diretamente)
const yearLinks = [
  { year: '1968', link: 'https://hotwheels.fandom.com/wiki/List_of_1968_Hot_Wheels' },
  { year: '1969', link: 'https://hotwheels.fandom.com/wiki/List_of_1969_Hot_Wheels' },
  // Adicione mais links aqui conforme necessário
];

// Função para adicionar um pequeno delay entre requisições
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeModels(year, yearLink) {
  try {
    await sleep(2000); // Delay de 2 segundos para evitar bloqueio
    const { data } = await axios.get(yearLink);
    const $ = cheerio.load(data);
    const models = [];

    // Encontrando os modelos na tabela
    $('.mw-parser-output table tr').each((_, row) => {
      const columns = $(row).find('td');
      if (columns.length > 0) {
        const name = $(columns[0]).text().trim();
        const imageElement = $(columns).find('img');
        let imageUrl = imageElement.attr('src') || '';

        if (!name) return;

        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = baseURL + imageUrl;
        }

        models.push({ name, imageUrl, year });
      }
    });

    console.log(`📆 Modelos do ano ${year}: ${models.length}`);
    return models;
  } catch (error) {
    console.error(`❌ Erro ao raspar modelos do ano ${year}:`, error);
    return [];
  }
}

async function scrapeAndSave() {
  try {
    // Testando com os links diretamente fornecidos
    for (const { year, link } of yearLinks) {
      console.log(`🔄 Raspando modelos do ano ${year}...`);
      const models = await scrapeModels(year, link);

      if (models.length > 0) {
        try {
          await HotWheel.insertMany(models);
          console.log(`✅ ${models.length} modelos do ano ${year} salvos com sucesso.`);
        } catch (err) {
          console.error(`❌ Erro ao salvar modelos do ano ${year}:`, err);
        }
      } else {
        console.warn(`⚠️ Nenhum modelo encontrado para o ano ${year}.`);
      }
    }
  } catch (error) {
    console.error('❌ Erro na raspagem:', error);
  } finally {
    console.log('🎉 Raspagem concluída!');
    mongoose.disconnect();
  }
}

scrapeAndSave();
