# Hot Wheels Collection 🚗🔥

Este é um projeto Full Stack para gerenciamento de coleção de carrinhos Hot Wheels. Os usuários podem pesquisar modelos, adicionar à coleção e aos favoritos, e visualizar imagens obtidas via web scraping.

## 🛠 Tecnologias Utilizadas

- **Frontend:** React, React Router, CSS
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Autenticação:** JWT (JSON Web Token)
- **Web Scraping:** Axios, Cheerio

## 📌 Funcionalidades

- 🔍 **Busca de Modelos:** Pesquisa carrinhos pelo nome
- 🏆 **Minha Coleção:** Adiciona modelos à coleção do usuário
- ⭐ **Favoritos:** Salva modelos desejados
- 📅 **Filtragem por Ano:** Exibe modelos de um ano específico
- 📸 **Imagens Automáticas:** Obtidas via scraping da Hot Wheels Wiki ou Google Images

## 🚀 Como Rodar o Projeto

### 1️⃣ Clone o Repositório
```bash
git clone https://github.com/seu-usuario/hotwheels-collection.git
cd hotwheels-collection
```

### 2️⃣ Configurar o Backend

1. Instale as dependências:
```bash
cd backend
npm install
```
2. Crie um arquivo `.env` com as credenciais do MongoDB:
```
MONGO_URI=seu_mongo_uri
JWT_SECRET=sua_chave_secreta
```
3. Inicie o servidor:
```bash
npm run dev
```

### 3️⃣ Configurar o Frontend

1. Instale as dependências:
```bash
cd ../frontend
npm install
```
2. Inicie o projeto:
```bash
npm start
```

## 📡 API Endpoints

### 🔍 Buscar Hot Wheels
```http
GET /api/hotwheels/search?name={nome}
```

### ➕ Adicionar à Coleção
```http
POST /api/collection/add
Body: { userId, hotWheelId }
```

### ⭐ Adicionar aos Favoritos
```http
POST /api/collection/favorite
Body: { userId, hotWheelId }
```

## 🎨 Ajuste de Formatação dos Nomes
Para evitar que os nomes tenham números no início, foi feita uma normalização no backend antes de salvar no banco de dados.

## 🧠 Reconhecimento de Imagem (Recognizer)
O endpoint de reconhecimento (`/api/recognizer/reconhecer`) agora utiliza `multer.memoryStorage()`, processando a imagem diretamente em memória sem salvar arquivos no disco. Isso reduz uso de armazenamento e atende ao requisito de não persistir a imagem enviada. O cadastro (`/api/recognizer/cadastrar`) apenas registra o nome e marca `filePath` como `memory` (sem arquivo físico). Caso não queira cadastro, o endpoint pode ser removido.

## 📜 Licença
Este projeto é de uso livre para fins educacionais e não comerciais.


