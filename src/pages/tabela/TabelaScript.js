const STORAGE_KEY = "esquadralum_pedidos_v1";
const initialOrders = [
  { id: 1, client: "João Silva", type: "Janela", width: 1200, height: 1000, quantity: 2, status: "Em produção" },
  { id: 2, client: "Maria Souza", type: "Porta", width: 2100, height: 2200, quantity: 1, status: "Concluído" },
  { id: 3, client: "Carlos Lima", type: "Janela", width: 1500, height: 1200, quantity: 3, status: "Pendente" },
  { id: 4, client: "Ana Costa", type: "Basculante", width: 800, height: 600, quantity: 1, status: "Em produção" },
  { id: 5, client: "Pedro Alves", type: "Porta", width: 2000, height: 2100, quantity: 2, status: "Concluído" }
];

let orders = loadOrders();
const body = document.getElementById("ordersBody");
const dialog = document.getElementById("orderDialog");
const form = document.getElementById("orderForm");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const statusFilter = document.getElementById("statusFilter");

function loadOrders() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialOrders;
  } catch (error) {
    console.error("Não foi possível carregar os pedidos:", error);
    return initialOrders;
  }
}
function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}
function statusClass(status) {
  if (status === "Concluído") return "status-done";
  if (status === "Pendente") return "status-pending";
  return "status-production";
}
function render() {
  const term = searchInput.value.trim().toLowerCase();
  const type = typeFilter.value;
  const status = statusFilter.value;
  const filtered = orders.filter(order => {
    const matchesSearch = String(order.id).padStart(3, "0").includes(term) ||
      order.client.toLowerCase().includes(term);
    return matchesSearch && (!type || order.type === type) && (!status || order.status === status);
  });
  body.innerHTML = filtered.map(order => `
    <tr>
      <td class="code">${String(order.id).padStart(3, "0")}</td>
      <td>${escapeHtml(order.client)}</td>
      <td>${escapeHtml(order.type)}</td>
      <td>${Number(order.width).toLocaleString("pt-BR")} × ${Number(order.height).toLocaleString("pt-BR")} mm</td>
      <td>${order.quantity}</td>
      <td><span class="status ${statusClass(order.status)}">${escapeHtml(order.status)}</span></td>
      <td><div class="actions">
        <button class="action-btn" data-action="edit" data-id="${order.id}">Editar</button>
        <button class="action-btn delete" data-action="delete" data-id="${order.id}">Excluir</button>
      </div></td>
    </tr>`).join("");
  document.getElementById("emptyState").hidden = filtered.length !== 0;
  document.getElementById("resultCount").textContent = `${filtered.length} ${filtered.length === 1 ? "registro" : "registros"}`;
  document.getElementById("totalCount").textContent = orders.length;
  document.getElementById("productionCount").textContent = orders.filter(o => o.status === "Em produção").length;
  document.getElementById("doneCount").textContent = orders.filter(o => o.status === "Concluído").length;
  document.getElementById("pendingCount").textContent = orders.filter(o => o.status === "Pendente").length;
}
function openNewOrder() {
  form.reset();
  document.getElementById("orderId").value = "";
  document.getElementById("modalTitle").textContent = "Novo pedido";
  document.getElementById("quantity").value = 1;
  dialog.showModal();
}
function editOrder(id) {
  const order = orders.find(item => item.id === id);
  if (!order) return;
  document.getElementById("orderId").value = order.id;
  document.getElementById("client").value = order.client;
  document.getElementById("type").value = order.type;
  document.getElementById("quantity").value = order.quantity;
  document.getElementById("width").value = order.width;
  document.getElementById("height").value = order.height;
  document.getElementById("status").value = order.status;
  document.getElementById("modalTitle").textContent = "Editar pedido";
  dialog.showModal();
}
document.getElementById("openModal").addEventListener("click", openNewOrder);
document.getElementById("closeModal").addEventListener("click", () => dialog.close());
document.getElementById("cancelModal").addEventListener("click", () => dialog.close());
[searchInput, typeFilter, statusFilter].forEach(element => element.addEventListener("input", render));
document.getElementById("clearFilters").addEventListener("click", () => {
  searchInput.value = ""; typeFilter.value = ""; statusFilter.value = ""; render();
});
body.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit") editOrder(id);
  if (button.dataset.action === "delete") {
    const order = orders.find(item => item.id === id);
    if (order && confirm(`Deseja excluir o pedido de ${order.client}?`)) {
      orders = orders.filter(item => item.id !== id);
      saveOrders(); render();
    }
  }
});
form.addEventListener("submit", event => {
  event.preventDefault();
  const idValue = document.getElementById("orderId").value;
  const order = {
    id: idValue ? Number(idValue) : (orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1),
    client: document.getElementById("client").value.trim(),
    type: document.getElementById("type").value,
    quantity: Number(document.getElementById("quantity").value),
    width: Number(document.getElementById("width").value),
    height: Number(document.getElementById("height").value),
    status: document.getElementById("status").value
  };
  if (!order.client || order.quantity < 1 || order.width < 1 || order.height < 1) {
    alert("Confira os dados preenchidos.");
    return;
  }
  if (idValue) orders = orders.map(item => item.id === order.id ? order : item);
  else orders.push(order);
  saveOrders(); render(); dialog.close();
});
render();
