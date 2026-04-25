# ERP API + Mock WhatsApp Chat

Backend ERP API-first em TypeScript/Fastify com MongoDB, pronto para ser consumido por:

- frontend administrativo
- frontend de chat que simula WhatsApp
- bot com IA local (Ollama/Llama)

## Recursos

- Cadastro de clientes (CPF/CNPJ, WhatsApp e endereço)
- Cadastro de produtos (código/SKU, NCM, preço, custo, estoque)
- Orçamentos com aprovação e conversão para pedido
- Pedidos com status comercial e logístico
- Financeiro e Fiscal por pedido
- Dashboard e relatórios gerenciais
- Chat mock WhatsApp com cadastro automático no primeiro contato
- IA local para responder dúvidas com contexto de produtos/estoque/pedidos

## Configuração

### Ambiente local

```bash
cp .env.example .env
npm install
npm run dev
```

### Ambiente Docker (API + Front + Mongo + IA)

```bash
cp .env.example .env
docker compose up -d --build
```

Serviços:

- API: `http://localhost:3000`
- Front: `http://localhost:8080`
- Ollama API: `http://localhost:11434`

Na primeira execução, o serviço `ollama-init` baixa o modelo definido em `AI_MODEL`.
Isso pode levar alguns minutos dependendo da internet e hardware.
O serviço `seed` também roda automaticamente na inicialização do Docker para cadastrar os dados de exemplo (clientes e produtos) antes da API subir.

### IA local (Ollama)

Exemplo com Ollama na mesma máquina:

```bash
ollama serve
ollama pull llama3.2:3b
```

No `.env`:

```env
AI_ENABLED=true
AI_BASE_URL=http://127.0.0.1:11434
AI_MODEL=llama3.2:3b
```

Se `AI_ENABLED=false`, o chat segue funcionando com fallback sem IA.

No Docker, use:

```env
AI_ENABLED=true
AI_BASE_URL=http://ollama:11434
AI_MODEL=llama3.2:3b
```

## Contratos de API (request/response)

### Padrão de resposta de erro

Quando há falha de validação/regra de negócio:

```json
{
  "message": "Descrição do erro"
}
```

Quando há erro de validação com Zod:

```json
{
  "message": "Dados inválidos",
  "issues": [
    {
      "code": "invalid_type",
      "path": ["campo"],
      "message": "..."
    }
  ]
}
```

### Health

- `GET /health`
- Response:

```json
{ "status": "ok" }
```

### Clientes

- `POST /customers`
- Body:

```json
{
  "name": "Cliente A",
  "phone": "5511999999999",
  "whatsapp": "5511999999999",
  "cpfCnpj": "12345678901",
  "address": {
    "street": "Rua A",
    "number": "100",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01000000",
    "complement": "Sala 1"
  }
}
```

- `GET /customers/:id`
- `GET /customers/phone/:phone`
- `GET /customers/:id/orders`

Exemplo de response (`GET /customers/:id`):

```json
{
  "_id": "customerObjectId",
  "name": "Cliente A",
  "phone": "5511999999999",
  "whatsapp": "5511999999999",
  "cpfCnpj": "12345678901",
  "address": {
    "street": "Rua A",
    "number": "100",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01000000",
    "complement": "Sala 1"
  },
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

### Produtos

- `POST /products`
- Body:

```json
{
  "code": "SKU-001",
  "name": "Produto X",
  "basicDescription": "Descrição curta",
  "fullDescription": "Descrição completa",
  "imageUrl": "https://exemplo.com/img.png",
  "salePrice": 99.9,
  "productionCost": 30,
  "ncm": "12345678",
  "stock": 20,
  "isFeatured": false
}
```

- `GET /products?page=1&limit=10`
- `GET /products/:id`
- `GET /products/search?name=produto`
- `PUT /products/:id` (payload parcial)
- `DELETE /products/:id`

Exemplo de response (`GET /products?page=1&limit=10`):

```json
{
  "page": 1,
  "limit": 10,
  "total": 1,
  "items": [
    {
      "_id": "productObjectId",
      "code": "SKU-001",
      "name": "Produto X",
      "basicDescription": "Descrição curta",
      "fullDescription": "Descrição completa",
      "salePrice": 99.9,
      "productionCost": 30,
      "ncm": "12345678",
      "stock": 20,
      "reservedStock": 0
    }
  ]
}
```

### Orçamentos

- `POST /quotes`
- Body:

```json
{
  "customerId": "customerObjectId",
  "items": [
    { "productId": "productObjectId", "quantity": 2, "discount": 5 }
  ]
}
```

- `GET /quotes/:id`
- `PATCH /quotes/:id/status`
- Body:

```json
{ "status": "approved" }
```

- `POST /quotes/:id/approve`
- Converte orçamento aprovado em pedido.

Exemplo de response (`POST /quotes/:id/approve`):

```json
{
  "_id": "orderObjectId",
  "customerId": "customerObjectId",
  "quoteId": "quoteObjectId",
  "status": "pending",
  "logisticStatus": "open",
  "total": 194.8
}
```

### Pedidos

- `POST /orders`
- Body:

```json
{
  "customerId": "customerObjectId",
  "items": [
    { "productId": "productObjectId", "quantity": 1 }
  ]
}
```

- `GET /orders/:id`
- `GET /orders/customer/:customerId`
- `PATCH /orders/:id/status` Body: `{ "status": "pending|paid|cancelled" }`
- `PATCH /orders/:id/logistic-status` Body: `{ "logisticStatus": "open|production|delivered" }`
- `POST /orders/:id/add-item` Body: `{ "productId": "...", "quantity": 1 }`
- `POST /orders/:id/remove-item` Body: `{ "productId": "..." }`

Exemplo de response (`GET /orders/:id`):

```json
{
  "_id": "orderObjectId",
  "customerId": "customerObjectId",
  "status": "pending",
  "logisticStatus": "open",
  "items": [
    {
      "productId": "productObjectId",
      "name": "Produto X",
      "unitPrice": 99.9,
      "quantity": 2
    }
  ],
  "total": 199.8
}
```

### Pagamento / Financeiro / Fiscal / Estoque

- `POST /payments/:orderId/pay`
- `GET /payments/:orderId`
- `GET /finance/:orderId`
- `GET /fiscal/:orderId`
- `GET /inventory`
- `PATCH /inventory/:productId` Body: `{ "stock": 50 }`

Exemplo de response (`POST /payments/:orderId/pay`):

```json
{
  "_id": "paymentObjectId",
  "orderId": "orderObjectId",
  "status": "paid",
  "transactionId": "uuid-transaction-id"
}
```

### Gestão

- `GET /management/dashboard`
- `GET /management/reports/sales`
- `GET /management/reports/delinquency`
- `GET /management/reports/products`

Exemplo de response (`GET /management/dashboard`):

```json
{
  "ordersTotal": 14,
  "revenue": 15430.5,
  "pendingFinance": 3,
  "lowStockProducts": 2
}
```

### Bot API (auxiliar)

- `POST /bot/assist`
- Body:

```json
{ "phone": "5511999999999", "message": "quais produtos você tem?" }
```

- `GET /bot/products?page=1&limit=10`
- `GET /bot/products/:id`
- `POST /bot/customers`
- `POST /bot/quotes`
- `POST /bot/quotes/:id/approve`
- `POST /bot/orders`
- `POST /bot/orders/:id/items`
- `POST /bot/orders/:id/checkout`
- `POST /bot/orders/:id/pay`

### Chat mock WhatsApp (principal para frontend dos seus amigos)

- `POST /chat/mock-whatsapp/message`
- Body:

```json
{
  "phone": "5511998888777",
  "name": "Cliente Chat",
  "message": "/help"
}
```

- Response:

```json
{
  "customer": {
    "id": "customerObjectId",
    "name": "Cliente Chat",
    "phone": "5511998888777"
  },
  "reply": "Comandos disponíveis: ..."
}
```

- `GET /chat/context/products?query=mouse`
- `GET /chat/context/customer/:phone/orders`

Exemplo de response (`GET /chat/context/products?query=mouse`):

```json
[
  {
    "id": "productObjectId",
    "code": "SKU-010",
    "name": "Mouse Gamer",
    "basicDescription": "Mouse com RGB",
    "fullDescription": "Mouse gamer com 7 botões...",
    "salePrice": 149.9,
    "stock": 30,
    "reservedStock": 2,
    "availableStock": 28
  }
]
```

## Integração do frontend de chat

Fluxo sugerido para o frontend que simula WhatsApp:

1. Usuário envia mensagem no chat UI.
2. Front chama `POST /chat/mock-whatsapp/message`.
3. Renderiza a resposta `reply` no balão do bot.
4. Mantém `phone` como identificador da conversa.
5. Para painéis auxiliares, usa:
   - `GET /chat/context/products`
   - `GET /chat/context/customer/:phone/orders`

Comandos reconhecidos no chat:

- `/help`
- `/catalogo`
- `/carrinho`
- `/meuspedidos`
- `/orcamento <produtoId> <quantidade>`
- `/aprovar <quoteId>`
- `/pagar [orderId]` (sem informar `orderId`, o bot tenta pagar o pedido pendente mais recente)
- `/status <orderId>`

Mensagens que não começam com `/` são tratadas pela IA local com contexto de produtos/estoque/pedidos.  
No fluxo de compra por conversa, o bot identifica intenção de compra, confirma quantidade e gera o pedido automaticamente; no final, basta o cliente enviar `/pagar`.
O bot também mantém um carrinho por cliente, permitindo adicionar vários produtos antes de fechar o pedido.

### Integração recomendada para o time de frontend

Base URL:

- local: `http://localhost:3000`
- docker/rede: `http://<host-ou-ip>:3000`

Checklist de integração:

1. Guardar `phone` como identificador único da conversa.
2. Enviar mensagens para `POST /chat/mock-whatsapp/message`.
3. Exibir `reply` no histórico de chat.
4. Ao abrir conversa, opcionalmente carregar:
   - `GET /chat/context/customer/:phone/orders`
   - `GET /chat/context/products?query=...` (auto-sugestão de catálogo)
5. Para ações de operação (aprovar orçamento, pagar pedido), chamar endpoints ERP (`/quotes`, `/payments`) e refletir no chat.

Exemplo de chamada frontend (fetch):

```js
const res = await fetch("http://localhost:3000/chat/mock-whatsapp/message", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    phone: "5511999999999",
    name: "Cliente Web",
    message: "/catalogo"
  })
});
const data = await res.json();
console.log(data.reply);
```

### Endpoints por domínio (resumo rápido)

- `customers`: cadastro e consulta de clientes.
- `products`: catálogo, estoque, pesquisa e manutenção.
- `quotes`: orçamento e aprovação.
- `orders`: pedidos e status logístico.
- `payments`/`finance`/`fiscal`: pagamento e dados financeiros/fiscais.
- `management`: métricas e relatórios para dashboard.
- `chat`: camada principal para simulação de WhatsApp no frontend.

## Scripts úteis

```bash
npm run build
npm test
npm run seed
npm run docker:up
npm run docker:down
npm run docker:reset-all
```
