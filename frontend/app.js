const output = document.getElementById("output");
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const saveApiUrlBtn = document.getElementById("saveApiUrlBtn");

const savedBaseUrl = localStorage.getItem("apiBaseUrl");
if (savedBaseUrl) {
  apiBaseUrlInput.value = savedBaseUrl;
}

saveApiUrlBtn.addEventListener("click", () => {
  localStorage.setItem("apiBaseUrl", apiBaseUrlInput.value.trim());
  writeOutput({ message: "Base URL salva." });
});

function getBaseUrl() {
  return (apiBaseUrlInput.value || "http://localhost:3000").trim();
}

function writeOutput(content) {
  output.textContent = typeof content === "string" ? content : JSON.stringify(content, null, 2);
}

async function requestApi(path, options = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  writeOutput({
    status: response.status,
    path,
    body
  });
}

function value(form, name) {
  return String(form.get(name) || "").trim();
}

function numberValue(form, name) {
  return Number(form.get(name));
}

document.getElementById("createCustomerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: value(form, "name"),
      phone: value(form, "phone"),
      whatsapp: value(form, "phone"),
      cpfCnpj: value(form, "cpfCnpj"),
      address: {
        street: value(form, "street"),
        number: value(form, "number"),
        district: value(form, "district"),
        city: value(form, "city"),
        state: value(form, "state"),
        zipCode: value(form, "zipCode")
      }
    })
  });
});

document.getElementById("findCustomerByPhoneForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/customers/phone/${value(form, "phone")}`);
});

document.getElementById("listCustomerOrdersForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/customers/${value(form, "customerId")}/orders`);
});

document.getElementById("createProductForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi("/products", {
    method: "POST",
    body: JSON.stringify({
      code: value(form, "code"),
      name: value(form, "name"),
      basicDescription: value(form, "basicDescription"),
      fullDescription: value(form, "fullDescription"),
      imageUrl: value(form, "imageUrl"),
      salePrice: numberValue(form, "salePrice"),
      productionCost: numberValue(form, "productionCost"),
      ncm: value(form, "ncm"),
      stock: numberValue(form, "stock")
    })
  });
});

document.getElementById("updateProductForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = {};
  if (value(form, "name")) payload.name = value(form, "name");
  if (value(form, "salePrice")) payload.salePrice = numberValue(form, "salePrice");
  if (value(form, "stock")) payload.stock = numberValue(form, "stock");
  await requestApi(`/products/${value(form, "productId")}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
});

document.getElementById("deleteProductForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/products/${value(form, "productId")}`, { method: "DELETE" });
});

document.getElementById("listProductsBtn").addEventListener("click", async () => {
  await requestApi("/products");
});

document.getElementById("createQuoteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const discount = value(form, "discount");
  await requestApi("/quotes", {
    method: "POST",
    body: JSON.stringify({
      customerId: value(form, "customerId"),
      items: [
        {
          productId: value(form, "productId"),
          quantity: numberValue(form, "quantity"),
          ...(discount ? { discount: numberValue(form, "discount") } : {})
        }
      ]
    })
  });
});

document.getElementById("approveQuoteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/quotes/${value(form, "quoteId")}/approve`, {
    method: "POST"
  });
});

document.getElementById("createOrderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi("/orders", {
    method: "POST",
    body: JSON.stringify({
      customerId: value(form, "customerId"),
      items: [
        {
          productId: value(form, "productId"),
          quantity: numberValue(form, "quantity")
        }
      ]
    })
  });
});

document.getElementById("addOrderItemForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/orders/${value(form, "orderId")}/add-item`, {
    method: "POST",
    body: JSON.stringify({
      productId: value(form, "productId"),
      quantity: numberValue(form, "quantity")
    })
  });
});

document.getElementById("listOrdersByCustomerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/orders/customer/${value(form, "customerId")}`);
});

document.getElementById("updateLogisticStatusForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/orders/${value(form, "orderId")}/logistic-status`, {
    method: "PATCH",
    body: JSON.stringify({ logisticStatus: value(form, "logisticStatus") })
  });
});

document.getElementById("payOrderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/payments/${value(form, "orderId")}/pay`, {
    method: "POST"
  });
});

document.getElementById("listInventoryBtn").addEventListener("click", async () => {
  await requestApi("/inventory");
});

document.getElementById("updateInventoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/inventory/${value(form, "productId")}`, {
    method: "PATCH",
    body: JSON.stringify({ stock: numberValue(form, "stock") })
  });
});

document.getElementById("getFinanceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/finance/${value(form, "orderId")}`);
});

document.getElementById("getFiscalForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/fiscal/${value(form, "orderId")}`);
});

document.getElementById("dashboardBtn").addEventListener("click", async () => {
  await requestApi("/management/dashboard");
});

document.getElementById("salesReportBtn").addEventListener("click", async () => {
  await requestApi("/management/reports/sales");
});

document.getElementById("delinquencyReportBtn").addEventListener("click", async () => {
  await requestApi("/management/reports/delinquency");
});

document.getElementById("productsReportBtn").addEventListener("click", async () => {
  await requestApi("/management/reports/products");
});

document.getElementById("botAssistForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi("/bot/assist", {
    method: "POST",
    body: JSON.stringify({ message: value(form, "message") })
  });
});

document.getElementById("botListProductsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const page = value(form, "page") || "1";
  const limit = value(form, "limit") || "10";
  await requestApi(`/bot/products?page=${page}&limit=${limit}`);
});

document.getElementById("botCreateCustomerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi("/bot/customers", {
    method: "POST",
    body: JSON.stringify({
      phone: value(form, "phone"),
      name: value(form, "name")
    })
  });
});

document.getElementById("botCreateQuoteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi("/bot/quotes", {
    method: "POST",
    body: JSON.stringify({
      phone: value(form, "phone"),
      items: [
        {
          productId: value(form, "productId"),
          quantity: numberValue(form, "quantity")
        }
      ]
    })
  });
});

document.getElementById("botApproveQuoteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/bot/quotes/${value(form, "quoteId")}/approve`, {
    method: "POST"
  });
});

document.getElementById("botCreateOrderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi("/bot/orders", {
    method: "POST",
    body: JSON.stringify({
      phone: value(form, "phone"),
      items: [
        {
          productId: value(form, "productId"),
          quantity: numberValue(form, "quantity")
        }
      ]
    })
  });
});

document.getElementById("botCheckoutOrderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/bot/orders/${value(form, "orderId")}/checkout`, {
    method: "POST"
  });
});

document.getElementById("botPayOrderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  await requestApi(`/bot/orders/${value(form, "orderId")}/pay`, {
    method: "POST"
  });
});
