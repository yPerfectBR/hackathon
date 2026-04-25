# Fastify + MongoDB Template

Template ERP API-first com TypeScript, Fastify, MongoDB, Docker Compose, frontend visual e testes automatizados.

## Recursos

- Gestão de clientes com CPF/CNPJ, WhatsApp e endereço
- Gestão de produtos com código, NCM, custo, preço e estoque
- Orçamentos com aprovação e conversão para pedido
- Pedido com status comercial e status logístico
- Financeiro e Fiscal vinculados ao pedido
- Dashboard e relatórios de vendas/inadimplência/produtos
- Endpoints para bot WhatsApp e frontend consumirem a mesma API

## Executar local

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Instale dependências:

```bash
npm install
```

3. Rode em modo dev:

```bash
npm run dev
```

## Executar com Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Frontend visual: [http://localhost:8080](http://localhost:8080)  
API: [http://localhost:3000](http://localhost:3000)

## Scripts Docker (npm)

```bash
npm run docker:up
npm run docker:down
npm run docker:restart
npm run docker:logs
npm run docker:build
npm run docker:ps
npm run docker:clean
npm run docker:endpoints
```

## Testes

```bash
npm test
```

## Endpoints principais

- `GET /health`
- `POST /products`
- `GET /products`
- `GET /products/search?name=...`
- `GET /products/:id`
- `PATCH /products/:id`
- `DELETE /products/:id`
- `POST /customers`
- `GET /customers/:id`
- `GET /customers/phone/:phone`
- `GET /customers/:id/orders`
- `POST /quotes`
- `PATCH /quotes/:id/status`
- `POST /quotes/:id/approve`
- `POST /orders`
- `GET /orders/:id`
- `GET /orders/customer/:customerId`
- `PATCH /orders/:id/status`
- `PATCH /orders/:id/logistic-status`
- `POST /payments/:orderId/pay`
- `GET /payments/:orderId`
- `GET /finance/:orderId`
- `GET /fiscal/:orderId`
- `GET /inventory`
- `PATCH /inventory/:productId`
- `GET /management/dashboard`
- `GET /management/reports/sales`
- `GET /management/reports/delinquency`
- `GET /management/reports/products`
- `POST /bot/assist`
- `GET /bot/products`
- `GET /bot/products/:id`
- `POST /bot/customers`
- `POST /bot/quotes`
- `POST /bot/quotes/:id/approve`
- `POST /bot/orders`
- `POST /bot/orders/:id/items`
- `POST /bot/orders/:id/checkout`
- `POST /bot/orders/:id/pay`
