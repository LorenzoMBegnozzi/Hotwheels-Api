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
2. Configure a URL do backend (necessário para carregar imagens de `/uploads` em produção):

- Local: crie `frontend/.env` (ou use o `frontend/.env.example`) com:
	`REACT_APP_API_URL=http://localhost:5000`
- Railway/produção: configure a variável de ambiente do serviço do frontend:
	`REACT_APP_API_URL=https://hotwheels-api-production.up.railway.app`

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

## 💳 Assinatura (Planos + AbacatePay)

Foi adicionada uma tela de assinatura no frontend (`/assinatura`) e uma integração no backend com a AbacatePay para criar cobranças via PIX.

### Planos e limites

- **FREE (grátis)**: 50 na coleção + 50 na lista de desejos
- **PLAN_990 (R$ 9,90)**: 150 + 150
- **PLAN_1490 (R$ 14,90)**: 300 + 300
- **PLAN_1990 (R$ 19,90)**: sem limites

Observação: como a API documentada da AbacatePay cria cobranças `ONE_TIME`, o projeto ativa o plano por **30 dias** após confirmação do pagamento.

### Variáveis de ambiente (backend)

Adicione no `backend/.env`:

```
ABACATEPAY_API_KEY=seu_token_da_abacatepay
ABACATEPAY_WEBHOOK_SECRET=seu_secret_do_webhook
ABACATEPAY_WEBHOOK_PUBLIC_KEY=sua_public_hmac_key

# opcionais
FRONTEND_URL=http://localhost:3000
ABACATEPAY_RETURN_URL=http://localhost:3000/profile
ABACATEPAY_COMPLETION_URL=http://localhost:3000/assinatura/sucesso
```

### Endpoints de billing

- `GET /api/billing/plans` (público)
- `GET /api/billing/me` (auth)
- `POST /api/billing/checkout` (auth) body: `{ planId }`
- `POST /api/billing/confirm` (auth) body: `{ billingId }`
- `POST /api/billing/activate-free` (auth)
- `POST /api/billing/webhook?webhookSecret=...` (webhook AbacatePay)

## 🎨 Ajuste de Formatação dos Nomes
Para evitar que os nomes tenham números no início, foi feita uma normalização no backend antes de salvar no banco de dados.

## 🧠 Reconhecimento de Imagem (Recognizer)
O endpoint de reconhecimento (`/api/recognizer/reconhecer`) agora utiliza `multer.memoryStorage()`, processando a imagem diretamente em memória sem salvar arquivos no disco. Isso reduz uso de armazenamento e atende ao requisito de não persistir a imagem enviada. O cadastro (`/api/recognizer/cadastrar`) apenas registra o nome e marca `filePath` como `memory` (sem arquivo físico). Caso não queira cadastro, o endpoint pode ser removido.

### 🔧 Tuning de Performance do Reconhecedor
Você pode ajustar variáveis de ambiente para equilibrar velocidade e precisão:

```
RECOGNIZER_IMG_SIZE=128        # Tamanho para resize da imagem (ex: 96, 128, 192). Menor = mais rápido.
RECOGNIZER_BINS=8              # Bins por canal (ex: 6 ou 8). Menor = histograma menor e mais rápido.
RECOGNIZER_THRESHOLD=0.6       # Limite de similaridade (cosine) para entrar no top3.
RECOGNIZER_CACHE_CONCURRENCY=5 # Número de requisições paralelas ao construir cache.
```

Internamente utiliza histograma 3D + similaridade por cosseno (cosine). Tudo é calculado em memória sem salvar a imagem enviada.

### 🔤 Reconhecimento por Texto (Parte de Baixo do Carrinho)
Além do reconhecimento por imagem, há um segundo modo que utiliza foto da parte inferior do carrinho para extrair o nome e ano estampados.

Endpoint:
```
POST /api/recognizer/text
Form-Data: file= (imagem underside)
```
Resposta típica:
```json
{
	"status": "ok",
	"mensagem": "Top 3 por texto",
	"texto": "BATMAN & ROBIN BATMOBILE 2025",
	"anoDetectado": 2025,
	"top3": [ { "id": "...", "nome": "Batman and Robin Batmobile", "score": 0.92 } ]
}
```

Pipeline:
1. Pré-processa (grayscale, normalize, resize).
2. Usa Tesseract OCR (tesseract.js) para extrair texto bruto.
3. Limpa texto (remove ruído e caracteres estranhos).
4. Detecta ano (regex (19|20)\d{2}).
5. Faz fuzzy matching (Levenshtein) contra todos os nomes no banco e aplica bônus/penalidade pelo ano.

Variáveis de ambiente:
```
OCR_VERBOSE=1  # Log detalhado do processo OCR
```

Testar via PowerShell:
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:5000/api/recognizer/text" -Form @{ file = Get-Item .\underside.jpg }
```

Melhorias futuras sugeridas:
- Whitelist de tokens (ex: BATMOBILE, CORVETTE) para correção automática.
- Normalização de símbolos (& -> AND).
- Suporte multi-idioma se necessário.


## 📜 Licença
Este projeto é de uso livre para fins educacionais e não comerciais.


