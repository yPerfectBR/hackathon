const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const saveApiUrlBtn = document.getElementById("saveApiUrlBtn");
const menuTabs = document.querySelectorAll("#menuTabs button");
const screens = document.querySelectorAll(".screen");
const productsTableBody = document.getElementById("productsTableBody");
const customerLookupOutput = document.getElementById("customerLookupOutput");
const salesOutput = document.getElementById("salesOutput");
const chatMessages = document.getElementById("chatMessages");

const chatPhone = document.getElementById("chatPhone");
const chatName = document.getElementById("chatName");
const chatMessageInput = document.getElementById("chatMessageInput");
const sendChatBtn = document.getElementById("sendChatBtn");

let productsChart;

const savedBaseUrl = localStorage.getItem("apiBaseUrl");
if (savedBaseUrl) apiBaseUrlInput.value = savedBaseUrl;

const savedChatPhone = localStorage.getItem("chatPhone");
if (savedChatPhone) chatPhone.value = savedChatPhone;
const savedChatName = localStorage.getItem("chatName");
if (savedChatName) chatName.value = savedChatName;

function getBaseUrl() {
  return (apiBaseUrlInput.value || "http://localhost:3000").trim();
}

function value(form, name) {
  return String(form.get(name) || "").trim();
}

function numberValue(form, name) {
  return Number(form.get(name));
}

function setOutput(node, content) {
  node.textContent = JSON.stringify(content, null, 2);
}

function setActiveScreen(screenName) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${screenName}`);
  });
  menuTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.screen === screenName);
  });
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
  if (!response.ok) {
    const message = body?.message || `Erro ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function appendChat(role, text) {
  const el = document.createElement("div");
  el.className = `chat-message ${role}`;
  el.textContent = text;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function refreshProductsTable() {
  const data = await requestApi("/products?page=1&limit=50");
  productsTableBody.innerHTML = "";
  data.items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.code}</td>
      <td>${item.name}</td>
      <td>R$ ${Number(item.salePrice).toFixed(2)}</td>
      <td>${item.stock - item.reservedStock}</td>
    `;
    productsTableBody.appendChild(tr);
  });
}

async function refreshDashboard() {
  const [dashboard, products] = await Promise.all([
    requestApi("/management/dashboard"),
    requestApi("/management/reports/products")
  ]);

  document.getElementById("metricOrders").textContent = dashboard.ordersTotal;
  document.getElementById("metricRevenue").textContent = `R$ ${Number(dashboard.revenue).toFixed(2)}`;
  document.getElementById("metricPending").textContent = dashboard.pendingFinance;
  document.getElementById("metricLowStock").textContent = dashboard.lowStockProducts;

  const productsLabels = products.slice(0, 8).map((item) => item.name);
  const productsValues = products.slice(0, 8).map((item) => item.quantitySold);

  if (productsChart) productsChart.destroy();
  productsChart = new Chart(document.getElementById("productsChart"), {
    type: "bar",
    data: {
      labels: productsLabels,
      datasets: [{ label: "Qtd vendida", data: productsValues, backgroundColor: "#1d4ed8" }]
    }
  });
}

menuTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveScreen(tab.dataset.screen);
  });
});

saveApiUrlBtn.addEventListener("click", () => {
  localStorage.setItem("apiBaseUrl", getBaseUrl());
});

sendChatBtn.addEventListener("click", async () => {
  const message = chatMessageInput.value.trim();
  if (!message) return;
  appendChat("user", message);
  chatMessageInput.value = "";
  localStorage.setItem("chatPhone", chatPhone.value.trim());
  localStorage.setItem("chatName", chatName.value.trim());
  try {
    const data = await requestApi("/chat/mock-whatsapp/message", {
      method: "POST",
      body: JSON.stringify({
        phone: chatPhone.value.trim(),
        name: chatName.value.trim(),
        message
      })
    });
    appendChat("bot", data.reply || "Sem resposta");
  } catch (error) {
    appendChat("bot", `Erro: ${String(error.message || error)}`);
  }
});

chatMessageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void sendChatBtn.click();
  }
});

document.getElementById("refreshDashboardBtn").addEventListener("click", async () => {
  try {
    await refreshDashboard();
  } catch (error) {
    alert(`Falha ao atualizar dashboard: ${error.message}`);
  }
});

document.getElementById("refreshProductsBtn").addEventListener("click", async () => {
  try {
    await refreshProductsTable();
  } catch (error) {
    alert(`Falha ao listar produtos: ${error.message}`);
  }
});

document.getElementById("createProductForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
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
    event.target.reset();
    await refreshProductsTable();
  } catch (error) {
    alert(`Falha ao criar produto: ${error.message}`);
  }
});

document.getElementById("createCustomerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const response = await requestApi("/customers", {
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
    setOutput(customerLookupOutput, response);
    event.target.reset();
  } catch (error) {
    alert(`Falha ao criar cliente: ${error.message}`);
  }
});

document.getElementById("findCustomerByPhoneForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const response = await requestApi(`/customers/phone/${value(form, "phone")}`);
    setOutput(customerLookupOutput, response);
  } catch (error) {
    setOutput(customerLookupOutput, { error: error.message });
  }
});

document.getElementById("createQuoteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const discount = value(form, "discount");
  try {
    const response = await requestApi("/quotes", {
      method: "POST",
      body: JSON.stringify({
        customerId: value(form, "customerId"),
        items: [{
          productId: value(form, "productId"),
          quantity: numberValue(form, "quantity"),
          ...(discount ? { discount: numberValue(form, "discount") } : {})
        }]
      })
    });
    setOutput(salesOutput, response);
  } catch (error) {
    setOutput(salesOutput, { error: error.message });
  }
});

document.getElementById("approveQuoteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const response = await requestApi(`/quotes/${value(form, "quoteId")}/approve`, { method: "POST" });
    setOutput(salesOutput, response);
  } catch (error) {
    setOutput(salesOutput, { error: error.message });
  }
});

document.getElementById("payOrderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    const response = await requestApi(`/payments/${value(form, "orderId")}/pay`, { method: "POST" });
    setOutput(salesOutput, response);
  } catch (error) {
    setOutput(salesOutput, { error: error.message });
  }
});

void refreshProductsTable();
void refreshDashboard();
