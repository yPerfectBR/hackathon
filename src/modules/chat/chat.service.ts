import { AIService } from "../ai/ai.service";
import { CustomerRepository } from "../customer/customer.repository";
import { CustomerService } from "../customer/customer.service";
import { InventoryService } from "../inventory/inventory.service";
import { OrderRepository } from "../order/order.repository";
import { OrderService } from "../order/order.service";
import { PaymentRepository } from "../payment/payment.repository";
import { PaymentService } from "../payment/payment.service";
import { ProductRepository } from "../product/product.repository";
import { ProductService } from "../product/product.service";
import { QuoteService } from "../quote/quote.service";

type ChatMessageInput = {
  phone: string;
  message: string;
  name?: string;
};

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

type ProductRef = {
  productId: string;
  productName: string;
  unitPrice: number;
};

export class ChatService {
  private readonly customerService = new CustomerService(new CustomerRepository());
  private readonly productService = new ProductService(new ProductRepository());
  private readonly inventoryService = new InventoryService();
  private readonly orderService = new OrderService(new OrderRepository(), this.inventoryService);
  private readonly paymentService = new PaymentService(new PaymentRepository(), this.inventoryService);
  private readonly quoteService = new QuoteService();
  private readonly aiService = new AIService();
  private readonly carts = new Map<string, Map<string, CartItem>>();
  private readonly lastProductByCustomer = new Map<string, ProductRef>();
  private readonly pendingAddToCartByCustomer = new Map<string, { product: ProductRef; quantity: number }>();

  private normalizeText(value: string) {
    return value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  }

  private hasPurchaseIntent(message: string) {
    return /(compr|quero|levar|pedido|pegar|fechar|adquir|comprar)/.test(message);
  }

  private isAffirmative(message: string) {
    return /^(sim|s|ok|pode|confirmo|confirmar|fechar|fecho|quero)$/i.test(message.trim());
  }

  private isNegative(message: string) {
    return /^(nao|não|n|cancelar|cancela|deixa|deixa pra la|deixa pra lá)$/i.test(message.trim());
  }

  private wantsOnlyCurrentItems(message: string) {
    return /(so isso|só isso|apenas isso|somente isso|pode fechar|fechar pedido|finalizar pedido)/.test(message);
  }

  private hasPaymentIntent(message: string) {
    return /(pagar|pagamento|pix|cartao|cartão|boleto)/.test(message);
  }

  private refersToPreviousProduct(message: string) {
    return /\b(ele|esse|essa|isso|este|esta|o mesmo|a mesma)\b/.test(message);
  }

  private extractQuantity(message: string) {
    const quantityMatch = message.match(
      /(?:^|\s)(\d{1,3})\s*(?:x|unidade(?:s)?|unid|pcs?)\b|quantidade\s*(\d{1,3})/i
    );
    if (!quantityMatch) {
      return null;
    }
    const quantity = Number(quantityMatch[1] ?? quantityMatch[2]);
    return Number.isInteger(quantity) && quantity > 0 ? quantity : null;
  }

  private getCart(customerId: string) {
    if (!this.carts.has(customerId)) {
      this.carts.set(customerId, new Map<string, CartItem>());
    }
    return this.carts.get(customerId)!;
  }

  private clearCart(customerId: string) {
    this.carts.delete(customerId);
  }

  private cartItems(customerId: string) {
    return Array.from(this.getCart(customerId).values());
  }

  private cartTotal(customerId: string) {
    return this.cartItems(customerId).reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  }

  private cartSummary(customerId: string) {
    const items = this.cartItems(customerId);
    if (items.length === 0) {
      return "Seu carrinho está vazio.";
    }

    const lines = items.map((item) => `- ${item.quantity}x ${item.productName} (R$ ${(item.unitPrice * item.quantity).toFixed(2)})`);
    return `Carrinho atual:\n${lines.join("\n")}\nTotal: R$ ${this.cartTotal(customerId).toFixed(2)}`;
  }

  private updateLastProductContext(customerId: string, product: {
    _id: string;
    name: string;
    salePrice: number;
  }) {
    this.lastProductByCustomer.set(customerId, {
      productId: product._id.toString(),
      productName: product.name,
      unitPrice: product.salePrice
    });
  }

  private findProductInMessage(message: string, inventory: Array<{
    _id: string;
    name: string;
    salePrice: number;
    stock: number;
    reservedStock: number;
  }>) {
    const normalizedMessage = this.normalizeText(message);
    const messageTokens = normalizedMessage.split(/\s+/).filter((token) => token.length > 2);

    let bestMatch: (typeof inventory)[number] | null = null;
    let bestScore = 0;

    for (const product of inventory) {
      const normalizedName = this.normalizeText(product.name);
      const nameTokens = normalizedName.split(/\s+/);
      let score = 0;

      if (normalizedMessage.includes(normalizedName)) {
        score += 10;
      }

      for (const token of messageTokens) {
        if (nameTokens.includes(token)) {
          score += 2;
          continue;
        }

        // tolera pequenas variações como "sorround" vs "surround"
        if (nameTokens.some((nameToken) =>
          (token.length >= 4 || nameToken.length >= 4)
          && (nameToken.includes(token) || token.includes(nameToken))
        )) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }

    return bestScore >= 2 ? bestMatch : null;
  }

  private shortProductPitch(product: {
    name: string;
    salePrice: number;
    stock: number;
    reservedStock: number;
  }) {
    const available = product.stock - product.reservedStock;
    return `${product.name}: R$ ${product.salePrice.toFixed(2)} | estoque ${available}.`;
  }

  private async resolveProductByReference(referenceRaw: string) {
    const reference = referenceRaw.trim();
    if (!reference) {
      return null;
    }

    if (/^[a-f0-9]{24}$/i.test(reference)) {
      return this.productService.findById(reference);
    }

    const inventory = await this.productService.listInventory();
    const normalizedReference = this.normalizeText(reference);
    return inventory.find((item) => this.normalizeText(item.name) === normalizedReference) ?? null;
  }

  async ensureCustomer(phone: string, name?: string) {
    const existingCustomer = await this.customerService.findByPhone(phone);
    if (existingCustomer) {
      return existingCustomer;
    }
    return this.customerService.upsertByPhone(phone, { name: name ?? `Cliente ${phone}` });
  }

  private async commandReply(input: ChatMessageInput, customerId: string) {
    const message = input.message
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/^／/, "/")
      .trim();
    const lower = message.toLowerCase();
    const isCommand = /^\/\S*/.test(message);

    if (!isCommand) {
      return null;
    }

    if (lower === "/help") {
      return [
        "Comandos disponíveis:",
        "- /help",
        "- /catalogo",
        "- /carrinho",
        "- /carrinho <id|nome exato> [quantidade]",
        "- /pedido",
        "- /orcamento <produtoId> <quantidade>",
        "- /aprovar <quoteId>",
        "- /pagar",
        "- /status <orderId>",
        "- /meuspedidos"
      ].join("\n");
    }

    if (/^\/catalogo\b/i.test(message)) {
      const { items } = await this.productService.findPaginated(0, 5);
      if (items.length === 0) {
        return "Não temos produtos cadastrados no momento.";
      }
      return `Produtos:\n${items.map((item) => `${item._id} | ${item.name} | R$ ${item.salePrice.toFixed(2)} | estoque ${item.stock - item.reservedStock}`).join("\n")}`;
    }

    if (lower === "/meuspedidos") {
      const orders = await this.orderService.getByCustomer(customerId);
      if (orders.length === 0) {
        return "Você ainda não possui pedidos.";
      }
      return `Seus pedidos:\n${orders.slice(0, 5).map((order) => `${order._id} | ${order.status} | R$ ${order.total.toFixed(2)}`).join("\n")}`;
    }

    if (lower === "/carrinho") {
      return this.cartSummary(customerId);
    }

    if (/^\/carrinho\b/i.test(message)) {
      const payload = message.replace(/^\/carrinho\b/i, "").trim();
      if (!payload) {
        return this.cartSummary(customerId);
      }
      const qtyMatch = payload.match(/^(.*)\s+(\d+)$/);
      const productRef = qtyMatch ? qtyMatch[1].trim() : payload;
      const quantity = qtyMatch ? Number(qtyMatch[2]) : 1;

      if (!productRef || !Number.isInteger(quantity) || quantity <= 0) {
        return "Formato inválido. Use: /carrinho <id|nome exato> [quantidade]";
      }

      const product = await this.resolveProductByReference(productRef);
      if (!product) {
        return "Produto não encontrado. Use id ou nome exato, ou /catalogo para listar.";
      }

      const available = product.stock - product.reservedStock;
      const cart = this.getCart(customerId);
      const existing = cart.get(product._id.toString());
      const currentInCart = existing?.quantity ?? 0;
      if (currentInCart + quantity > available) {
        return `Estoque insuficiente para ${product.name}. Disponível: ${available}, no carrinho: ${currentInCart}.`;
      }

      cart.set(product._id.toString(), {
        productId: product._id.toString(),
        productName: product.name,
        quantity: currentInCart + quantity,
        unitPrice: product.salePrice
      });

      return `${quantity}x ${product.name} adicionado(s) ao carrinho.\n${this.cartSummary(customerId)}\nQuando quiser finalizar, use /pedido.`;
    }

    if (/^\/pedido\b/i.test(message)) {
      const items = this.cartItems(customerId);
      if (items.length === 0) {
        const existingPendingOrders = await this.orderService.getByCustomer(customerId);
        const pendingOrder = existingPendingOrders
          .filter((order) => order.status === "pending")
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (pendingOrder) {
          return `Você já possui um pedido pendente (OrderID: ${pendingOrder._id}) no valor de R$ ${pendingOrder.total.toFixed(2)}.\nPara confirmar a compra, digite apenas /pagar`;
        }
        return "Seu carrinho está vazio. Use /carrinho <id|nome exato> [quantidade].";
      }

      const existingPendingOrders = await this.orderService.getByCustomer(customerId);
      const pendingOrder = existingPendingOrders
        .filter((order) => order.status === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (pendingOrder) {
        return `Você já possui um pedido pendente (OrderID: ${pendingOrder._id}) no valor de R$ ${pendingOrder.total.toFixed(2)}.\nPara confirmar a compra, digite apenas /pagar`;
      }

      try {
        const order = await this.orderService.createOrder({
          customerId,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
        });
        this.clearCart(customerId);
        return `Pedido criado com sucesso.\nOrderID: ${order._id}\nTotal: R$ ${order.total.toFixed(2)}\nPara confirmar a compra, digite apenas /pagar`;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Erro ao criar pedido.";
        return `Não consegui gerar o pedido: ${reason}`;
      }
    }

    if (/^\/orcamento\b/i.test(message)) {
      const [, productId, quantityRaw] = message.split(/\s+/);
      const quantity = Number(quantityRaw);
      if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
        return "Formato inválido. Use: /orcamento <produtoId> <quantidade>";
      }
      const quote = await this.quoteService.create({
        customerId,
        items: [{ productId, quantity }]
      });
      return `Orçamento criado: ${quote._id}\nTotal: R$ ${quote.total.toFixed(2)}\nPara aprovar: /aprovar ${quote._id}`;
    }

    if (/^\/aprovar\b/i.test(message)) {
      const [, quoteId] = message.split(/\s+/);
      if (!quoteId) {
        return "Formato inválido. Use: /aprovar <quoteId>";
      }
      const updatedQuote = await this.quoteService.updateStatus(quoteId, "approved");
      if (!updatedQuote) {
        return "Orçamento não encontrado. Verifique o ID informado.";
      }
      const order = await this.quoteService.convertToOrder(quoteId);
      return `Orçamento aprovado.\nPedido: ${order._id}\nTotal: R$ ${order.total.toFixed(2)}\nPara pagar, digite apenas /pagar`;
    }

    if (/^\/pagar\b/i.test(message)) {
      const [, informedOrderId] = message.split(/\s+/);
      let orderId = informedOrderId;

      if (!orderId) {
        const orders = await this.orderService.getByCustomer(customerId);
        const pendingOrders = orders
          .filter((order) => order.status === "pending")
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (pendingOrders.length === 0) {
          return "Você não possui pedidos pendentes para pagar.";
        }
        orderId = pendingOrders[0]._id.toString();
      }

      const payment = await this.paymentService.payOrder(orderId);
      const paidOrder = await this.orderService.getById(orderId);
      const orderLines = paidOrder
        ? paidOrder.items.map((item) => `- ${item.quantity}x ${item.name} (R$ ${(item.quantity * item.unitPrice).toFixed(2)})`).join("\n")
        : "Itens indisponíveis para resumo.";

      return [
        "Pagamento confirmado com sucesso. Obrigado pela compra!",
        `Transação: ${payment.transactionId}`,
        paidOrder ? `Pedido: ${paidOrder._id}` : null,
        paidOrder ? `Total pago: R$ ${paidOrder.total.toFixed(2)}` : null,
        "Resumo da compra:",
        orderLines,
        "Seu pedido foi registrado e já está em separação."
      ].filter(Boolean).join("\n");
    }

    if (/^\/status\b/i.test(message)) {
      const [, orderId] = message.split(/\s+/);
      if (!orderId) {
        return "Formato inválido. Use: /status <orderId>";
      }
      const order = await this.orderService.getById(orderId);
      if (!order) {
        return "Pedido não encontrado.";
      }
      return `Pedido ${order._id}\nStatus: ${order.status}\nLogística: ${order.logisticStatus}\nTotal: R$ ${order.total.toFixed(2)}`;
    }

    return "Comando não reconhecido. Digite /help para ver os comandos.";
  }

  private async aiReply(input: ChatMessageInput, customerId: string) {
    const normalizedMessage = this.normalizeText(input.message);
    const productsByName = await this.productService.searchByName(input.message);
    const inventory = await this.productService.listInventory();
    const orders = await this.orderService.getByCustomer(customerId);
    const purchaseProduct = this.findProductInMessage(input.message, inventory);
    const productFromSearch = productsByName[0] ?? null;
    const rememberedProductRef = this.lastProductByCustomer.get(customerId);
    const rememberedProduct = rememberedProductRef
      ? inventory.find((item) => item._id.toString() === rememberedProductRef.productId) ?? null
      : null;

    const targetProduct = purchaseProduct
      ?? productFromSearch
      ?? (
        this.refersToPreviousProduct(normalizedMessage) || this.hasPurchaseIntent(normalizedMessage)
          ? rememberedProduct
          : null
      );
    const hasItemsInCart = this.cartItems(customerId).length > 0;
    const pendingAdd = this.pendingAddToCartByCustomer.get(customerId);

    if (!pendingAdd && !hasItemsInCart && this.isAffirmative(normalizedMessage) && rememberedProduct) {
      const available = rememberedProduct.stock - rememberedProduct.reservedStock;
      if (available <= 0) {
        return `${rememberedProduct.name} está sem estoque no momento. Quer outra opção?`;
      }
      const cart = this.getCart(customerId);
      cart.set(rememberedProduct._id.toString(), {
        productId: rememberedProduct._id.toString(),
        productName: rememberedProduct.name,
        quantity: 1,
        unitPrice: rememberedProduct.salePrice
      });
      return `1x ${rememberedProduct.name} adicionado ao carrinho.\n${this.cartSummary(customerId)}\nDeseja mais alguma coisa ou só isso mesmo?`;
    }

    if (pendingAdd && this.isAffirmative(normalizedMessage)) {
      const product = inventory.find((item) => item._id.toString() === pendingAdd.product.productId);
      if (!product) {
        this.pendingAddToCartByCustomer.delete(customerId);
        return "Não encontrei esse produto agora. Pode pedir novamente pelo nome?";
      }

      const available = product.stock - product.reservedStock;
      const cart = this.getCart(customerId);
      const existing = cart.get(product._id.toString());
      const currentInCart = existing?.quantity ?? 0;
      if (currentInCart + pendingAdd.quantity > available) {
        this.pendingAddToCartByCustomer.delete(customerId);
        return `Temos ${available} unidade(s) de ${product.name}.`;
      }

      cart.set(product._id.toString(), {
        productId: product._id.toString(),
        productName: product.name,
        quantity: currentInCart + pendingAdd.quantity,
        unitPrice: product.salePrice
      });
      this.pendingAddToCartByCustomer.delete(customerId);
      this.updateLastProductContext(customerId, product);
      return `${pendingAdd.quantity}x ${product.name} adicionado(s) ao carrinho.\n${this.cartSummary(customerId)}\nDeseja mais alguma coisa ou só isso mesmo?`;
    }

    if (pendingAdd && this.isNegative(normalizedMessage)) {
      this.pendingAddToCartByCustomer.delete(customerId);
      return "Perfeito, não adicionei esse item. Quer escolher outro produto?";
    }

    if (hasItemsInCart && this.isNegative(normalizedMessage)) {
      return `${this.cartSummary(customerId)}\nSem problemas. Posso adicionar mais itens ou, quando quiser finalizar, é só responder "sim".`;
    }

    if (hasItemsInCart && (this.isAffirmative(normalizedMessage) || this.wantsOnlyCurrentItems(normalizedMessage))) {
      try {
        const order = await this.orderService.createOrder({
          customerId,
          items: this.cartItems(customerId).map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        });
        this.clearCart(customerId);
        return `Pedido criado com sucesso.\nOrderID: ${order._id}\nTotal: R$ ${order.total.toFixed(2)}\nPara concluir, rode apenas /pagar`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível fechar o pedido agora.";
        return `Não consegui fechar o pedido: ${message}`;
      }
    }

    if (targetProduct) {
      this.updateLastProductContext(customerId, targetProduct);
    }

    if (this.hasPaymentIntent(normalizedMessage)) {
      const pendingOrders = orders
        .filter((order) => order.status === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (pendingOrders.length > 0) {
        const order = pendingOrders[0];
        return `Perfeito! Seu pedido pendente é o OrderID ${order._id} no valor de R$ ${order.total.toFixed(2)}.\nPara pagar, rode apenas /pagar`;
      }
    }

    if (targetProduct && this.hasPurchaseIntent(normalizedMessage)) {
      const available = targetProduct.stock - targetProduct.reservedStock;
      if (available <= 0) {
        return `${targetProduct.name} está sem estoque no momento. Quer outra opção?`;
      }

      const quantity = this.extractQuantity(normalizedMessage) ?? 1;
      this.pendingAddToCartByCustomer.set(customerId, {
        product: {
          productId: targetProduct._id.toString(),
          productName: targetProduct.name,
          unitPrice: targetProduct.salePrice
        },
        quantity
      });
      return `${this.shortProductPitch(targetProduct)} Quer que eu adicione ${quantity} ao carrinho e já deixe pronto para pagamento?`;
    }

    if (targetProduct && !this.hasPurchaseIntent(normalizedMessage)) {
      const cart = this.getCart(customerId);
      const inCart = cart.get(targetProduct._id.toString())?.quantity ?? 0;
      const available = targetProduct.stock - targetProduct.reservedStock;
      return `${this.shortProductPitch(targetProduct)} ${inCart > 0 ? `No carrinho: ${inCart}. ` : ""}Quer que eu adicione ao carrinho?`;
    }

    if (this.hasPurchaseIntent(normalizedMessage) && !targetProduct) {
      return "Não consegui identificar o produto com segurança. Me diga o nome exato ou use /catalogo.";
    }

    const context = {
      customer: { phone: input.phone, customerId },
      matchedProducts: productsByName.slice(0, 5).map((item) => ({
        id: item._id,
        name: item.name,
        basicDescription: item.basicDescription,
        fullDescription: item.fullDescription,
        salePrice: item.salePrice,
        stock: item.stock,
        reservedStock: item.reservedStock
      })),
      inventory: inventory.slice(0, 20),
      customerOrders: orders.slice(0, 10).map((order) => ({
        id: order._id,
        status: order.status,
        logisticStatus: order.logisticStatus,
        total: order.total,
        items: order.items
      }))
    };

    const aiResponse = await this.aiService.ask(input.message, context);
    if (aiResponse) {
      return aiResponse;
    }

    if (productsByName.length > 0) {
      const product = productsByName[0];
      this.updateLastProductContext(customerId, product);
      return `${this.shortProductPitch(product)} Se quiser, diga: "quero comprar".`;
    }

    return "Não encontrei produto relacionado no cadastro. Digite /catalogo para ver opções.";
  }

  async handleMockWhatsAppMessage(input: ChatMessageInput) {
    const customer = await this.ensureCustomer(input.phone, input.name);
    let reply: string;
    try {
      const commandResponse = await this.commandReply(input, customer._id.toString());
      reply = commandResponse ?? await this.aiReply(input, customer._id.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro interno";
      reply = `Erro: ${message}`;
    }

    return {
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone
      },
      reply
    };
  }

  async getCustomerOrdersByPhone(phone: string) {
    const customer = await this.customerService.findByPhone(phone);
    if (!customer) {
      return null;
    }
    const orders = await this.orderService.getByCustomer(customer._id.toString());
    return { customer, orders };
  }

  async searchProductContext(query?: string) {
    const products = query
      ? await this.productService.searchByName(query)
      : (await this.productService.findPaginated(0, 20)).items;
    return products.map((product) => ({
      id: product._id,
      code: product.code,
      name: product.name,
      basicDescription: product.basicDescription,
      fullDescription: product.fullDescription,
      salePrice: product.salePrice,
      stock: product.stock,
      reservedStock: product.reservedStock,
      availableStock: product.stock - product.reservedStock
    }));
  }
}
