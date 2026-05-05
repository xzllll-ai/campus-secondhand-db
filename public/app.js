const STORAGE_KEY = "campus-secondhand-db-v2";

const initialData = {
  users: [
    { user_id: "u001", user_name: "ZhangSan", phone: "13800000001" },
    { user_id: "u002", user_name: "LiSi", phone: "13800000002" },
    { user_id: "u003", user_name: "WangWu", phone: "13800000003" },
    { user_id: "u004", user_name: "ZhaoLiu", phone: "13800000004" }
  ],
  items: [
    { item_id: "i001", item_name: "CalculusBook", category: "Book", price: 20, status: 0, seller_id: "u001" },
    { item_id: "i002", item_name: "DeskLamp", category: "DailyGoods", price: 35, status: 1, seller_id: "u002" },
    { item_id: "i003", item_name: "Microcontroller", category: "Electronics", price: 80, status: 0, seller_id: "u001" },
    { item_id: "i004", item_name: "Chair", category: "Furniture", price: 50, status: 1, seller_id: "u003" },
    { item_id: "i005", item_name: "WaterBottle", category: "DailyGoods", price: 15, status: 0, seller_id: "u004" }
  ],
  orders: [
    { order_id: "o001", item_id: "i002", buyer_id: "u001", order_date: "2024-05-01" },
    { order_id: "o002", item_id: "i004", buyer_id: "u002", order_date: "2024-05-03" }
  ]
};

const queryDefinitions = [
  {
    id: "unsold",
    title: "所有未售出的商品",
    run: (database) => database.items.filter((item) => item.status === 0)
  },
  {
    id: "price",
    title: "价格大于 30 的商品",
    run: (database) => database.items.filter((item) => item.price > 30)
  },
  {
    id: "daily",
    title: "生活用品类商品",
    run: (database) => database.items.filter((item) => item.category === "DailyGoods")
  },
  {
    id: "seller-u001",
    title: "u001 发布的所有商品",
    run: (database) => database.items.filter((item) => item.seller_id === "u001")
  },
  {
    id: "sold-buyer",
    title: "已售商品及其买家姓名",
    run: (database) => database.orders.map((order) => {
      const item = findItem(database, order.item_id);
      const buyer = findUser(database, order.buyer_id);
      return {
        item_id: order.item_id,
        item_name: item?.item_name || "",
        buyer_name: buyer?.user_name || ""
      };
    })
  },
  {
    id: "order-detail",
    title: "每个订单的商品名、买家名和日期",
    run: (database) => database.orders.map((order) => {
      const item = findItem(database, order.item_id);
      const buyer = findUser(database, order.buyer_id);
      return {
        order_id: order.order_id,
        item_name: item?.item_name || "",
        buyer_name: buyer?.user_name || "",
        order_date: order.order_date
      };
    })
  },
  {
    id: "u001-purchased",
    title: "卖家 u001 的商品购买情况",
    run: (database) => database.items
      .filter((item) => item.seller_id === "u001")
      .map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        purchase_status: database.orders.some((order) => order.item_id === item.item_id) ? "已购买" : "未购买"
      }))
  }
];

let db = loadDb();

const history = [];
const chartLines = [
  { key: "items", label: "商品总数", color: "#235f46" },
  { key: "sold", label: "已售商品", color: "#c96d4d" },
  { key: "unsold", label: "未售商品", color: "#a5c96f" },
  { key: "orders", label: "订单总数", color: "#f4b446" }
];

document.addEventListener("DOMContentLoaded", () => {
  bindScrollButtons();
  bindForms();
  bindViews();
  bindFilters();
  bindExport();
  bindTableInteractions();
  renderAll();
  renderQueryButtons();
});

function loadDb() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return clone(initialData);

  try {
    return JSON.parse(saved);
  } catch {
    return clone(initialData);
  }
}

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findUser(database, userId) {
  return database.users.find((user) => user.user_id === userId);
}

function findItem(database, itemId) {
  return database.items.find((item) => item.item_id === itemId);
}

function renderAll() {
  renderStats();
  renderTables();
  renderAggregates();
  renderPieChart();
  renderChart();
  renderView("sold");
  updateCategoryOptions();
}

function renderStats() {
  const soldCount = db.items.filter((item) => item.status === 1).length;
  const unsoldCount = db.items.filter((item) => item.status === 0).length;
  const avgPrice = average(db.items.map((item) => item.price));
  document.querySelector("#stats").innerHTML = [
    statCard("用户总数", db.users.length),
    statCard("商品总数", db.items.length),
    statCard("已售商品", soldCount),
    statCard("未售商品", unsoldCount),
    statCard("平均价格", avgPrice.toFixed(2))
  ].join("");
}

function statCard(label, value) {
  return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderTables() {
  let filtered = getFilteredItems();
  let users = db.users;
  let orders = db.orders;

  if (sortState.items) filtered = sortRows(filtered, sortState.items.col, sortState.items.dir);
  if (sortState.users) users = sortRows(users, sortState.users.col, sortState.users.dir);
  if (sortState.orders) orders = sortRows(orders, sortState.orders.col, sortState.orders.dir);

  document.querySelector("#itemsTable").innerHTML = table(filtered.map(formatItem), "items");
  document.querySelector("#usersTable").innerHTML = table(users, "users");
  document.querySelector("#ordersTable").innerHTML = table(orders, "orders");
}

function formatItem(item) {
  return {
    ...item,
    status: item.status === 1
      ? `<span class="badge sold">1 已售出</span>`
      : `<span class="badge open">0 未售出</span>`
  };
}

const sortState = {};

function table(rows, tableId) {
  if (!rows.length) return `<div class="empty-result"><p>没有查询到数据。</p></div>`;

  const columns = Object.keys(rows[0]);
  const currentSort = tableId ? sortState[tableId] : null;

  const head = columns.map((column) => {
    let cls = "";
    if (currentSort && currentSort.col === column) {
      cls = currentSort.dir === "asc" ? " sort-asc" : " sort-desc";
    }
    const arrow = '<span class="sort-arrow"></span>';
    const attr = tableId ? ` data-table="${tableId}" data-col="${column}"` : "";
    return `<th class="${cls.trim()}"${attr}>${column}${arrow}</th>`;
  }).join("");

  const body = rows.map((row) => {
    const cells = columns.map((column) => `<td>${row[column]}</td>`).join("");
    return `<tr class="clickable">${cells}</tr>`;
  }).join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function sortRows(rows, col, dir) {
  return [...rows].sort((a, b) => {
    const va = a[col];
    const vb = b[col];
    const na = Number(va);
    const nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb)) return dir === "asc" ? na - nb : nb - na;
    return dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
}

function renderQueryButtons() {
  const wrap = document.querySelector("#queryButtons");
  wrap.innerHTML = queryDefinitions
    .map((query) => `<button type="button" data-query="${query.id}">${query.title}</button>`)
    .join("");

  wrap.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-query]");
    if (!button) return;
    const query = queryDefinitions.find((item) => item.id === button.dataset.query);
    renderQuery(query);
    wrap.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
  });
}

function renderQuery(query) {
  document.querySelector("#queryTitle").textContent = query.title;
  document.querySelector("#queryResult").classList.remove("empty-result");
  let rows = query.run(db).map((row) => row.status !== undefined ? formatItem(row) : row);
  if (sortState.query) rows = sortRows(rows, sortState.query.col, sortState.query.dir);
  document.querySelector("#queryResult").innerHTML = table(rows, "query");
}

function renderAggregates() {
  const categoryCounts = db.items.reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + 1;
    return result;
  }, {});
  const topSeller = db.users
    .map((user) => ({
      user_id: user.user_id,
      user_name: user.user_name,
      count: db.items.filter((item) => item.seller_id === user.user_id).length
    }))
    .sort((left, right) => right.count - left.count)[0];

  const cards = [
    miniCard("统计商品总数", db.items.length),
    miniCard("计算所有商品平均价格", average(db.items.map((item) => item.price)).toFixed(2)),
    miniCard(
      "发布商品数量最多的用户",
      `<span class="seller-name">${topSeller.user_name}</span><span class="seller-count">${topSeller.count} 件</span>`,
      true
    ),
    miniCard(
      "统计每类商品数量",
      Object.entries(categoryCounts)
        .map(([category, count]) => `<span class="category-pill">${category}<b>${count}</b></span>`)
        .join(""),
      true
    )
  ];

  document.querySelector("#aggregateCards").innerHTML = cards.join("");
}

function miniCard(title, value, isHtml = false) {
  const content = isHtml
    ? `<div class="category-list">${value}</div>`
    : `<strong>${value}</strong>`;
  return `<article class="mini-card"><span>${title}</span>${content}</article>`;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
}

function bindViews() {
  document.querySelectorAll(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((item) => item.classList.toggle("active", item === button));
      renderView(button.dataset.view);
    });
  });
}

function renderView(type) {
  if (type === "sold") {
    let rows = db.orders.map((order) => ({
      item_name: findItem(db, order.item_id)?.item_name || "",
      buyer_id: order.buyer_id
    }));
    if (sortState.sold) rows = sortRows(rows, sortState.sold.col, sortState.sold.dir);
    document.querySelector("#viewTable").innerHTML = table(rows, "sold");
    return;
  }

  let rows = db.items.filter((item) => item.status === 0);
  if (sortState.unsold) rows = sortRows(rows, sortState.unsold.col, sortState.unsold.dir);
  document.querySelector("#viewTable").innerHTML = table(rows.map(formatItem), "unsold");
}

function bindForms() {
  document.querySelector("#addItemForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(event.target);
    if (findItem(db, data.item_id)) return message(`插入失败：商品 ${data.item_id} 已存在。`, true);
    if (!findUser(db, data.seller_id)) return message(`插入失败：卖家 ${data.seller_id} 不存在。`, true);

    db.items.push({
      item_id: data.item_id,
      item_name: data.item_name,
      category: data.category,
      price: Number(data.price),
      status: 0,
      seller_id: data.seller_id
    });
    saveAndRefresh(`已插入商品 ${data.item_id}。`, `插入${data.item_id}`);
  });

  document.querySelector("#updatePriceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(event.target);
    const item = findItem(db, data.item_id);
    if (!item) return message(`修改失败：商品 ${data.item_id} 不存在。`, true);
    item.price = Number(data.price);
    saveAndRefresh(`已将商品 ${data.item_id} 的价格修改为 ${data.price}。`, `改价${data.item_id}`);
  });

  document.querySelector("#deleteItemForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formData(event.target);
    const item = findItem(db, data.item_id);
    if (!item) return message(`删除失败：商品 ${data.item_id} 不存在。`, true);
    if (item.status !== 0 || db.orders.some((order) => order.item_id === data.item_id)) {
      return message("删除失败：只能删除未售出的商品。", true);
    }
    const ok = await showConfirm("删除商品", `确定要删除商品「${item.item_name}」（${data.item_id}）吗？此操作不可撤销。`);
    if (!ok) return;
    db.items = db.items.filter((record) => record.item_id !== data.item_id);
    saveAndRefresh(`已删除未售商品 ${data.item_id}。`, `删除${data.item_id}`);
  });

  document.querySelector("#buyItemForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formData(event.target);
    const item = findItem(db, data.item_id);
    const buyer = findUser(db, data.buyer_id);
    if (item && buyer) {
      const ok = await showConfirm("确认购买", `确定要让「${buyer.user_name}」购买商品「${item.item_name}」吗？`);
      if (!ok) return;
    }
    buyItem(data);
  });

  document.querySelector("#resetData").addEventListener("click", () => {
    db = clone(initialData);
    saveAndRefresh("已恢复初始数据。", "重置数据");
  });
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function buyItem(data) {
  if (db.orders.some((order) => order.order_id === data.order_id)) {
    return message(`购买失败：订单 ${data.order_id} 已存在。`, true);
  }
  if (!findUser(db, data.buyer_id)) {
    return message(`购买失败：买家 ${data.buyer_id} 不存在。`, true);
  }

  const item = findItem(db, data.item_id);
  if (!item) return message(`购买失败：商品 ${data.item_id} 不存在。`, true);
  if (item.status === 1 || db.orders.some((order) => order.item_id === data.item_id)) {
    return message("购买失败：已售商品不能再次购买。", true);
  }

  db.orders.push({
    order_id: data.order_id,
    item_id: data.item_id,
    buyer_id: data.buyer_id,
    order_date: data.order_date
  });
  item.status = 1;
  saveAndRefresh(`购买成功：新增订单 ${data.order_id}，商品 ${data.item_id} 已更新为已售出。`, `购买${data.item_id}`);
}

function saveAndRefresh(text, snapLabel) {
  recordSnapshot(snapLabel || text.replace(/[：。].*/g, "").slice(0, 8));
  saveDb();
  renderAll();
  message(text);
}

function message(text, isError = false) {
  const element = document.querySelector("#operationMessage");
  element.textContent = text;
  element.style.color = isError ? "var(--clay)" : "var(--green-dark)";
  showToast(text, isError ? "error" : "success");
}

function bindScrollButtons() {
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(button.dataset.scroll).scrollIntoView());
  });
}

function showToast(text, type = "success") {
  const container = document.querySelector("#toastContainer");
  const icon = type === "success"
    ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
    : '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icon}<span>${text}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("leaving");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

function showConfirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.querySelector("#confirmModal");
    document.querySelector("#confirmTitle").textContent = title;
    document.querySelector("#confirmMessage").textContent = message;
    modal.classList.add("visible");

    function cleanup(result) {
      modal.classList.remove("visible");
      document.querySelector("#confirmOk").removeEventListener("click", onOk);
      document.querySelector("#confirmCancel").removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onBackdrop(e) { if (e.target === modal) cleanup(false); }

    document.querySelector("#confirmOk").addEventListener("click", onOk);
    document.querySelector("#confirmCancel").addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
  });
}

function getFilteredItems() {
  const search = (document.querySelector("#searchInput").value || "").toLowerCase().trim();
  const category = document.querySelector("#categoryFilter").value;
  const status = document.querySelector("#statusFilter").value;
  return db.items.filter((item) => {
    if (search && !item.item_name.toLowerCase().includes(search)) return false;
    if (category && item.category !== category) return false;
    if (status !== "" && String(item.status) !== status) return false;
    return true;
  });
}

function bindFilters() {
  document.querySelector("#searchInput").addEventListener("input", renderTables);
  document.querySelector("#categoryFilter").addEventListener("change", renderTables);
  document.querySelector("#statusFilter").addEventListener("change", renderTables);
}

function updateCategoryOptions() {
  const select = document.querySelector("#categoryFilter");
  const current = select.value;
  const categories = [...new Set(db.items.map((item) => item.category))];
  select.innerHTML = '<option value="">全部类别</option>' +
    categories.map((c) => `<option value="${c}" ${c === current ? "selected" : ""}>${c}</option>`).join("");
}

function renderPieChart() {
  const categoryCounts = db.items.reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + 1;
    return result;
  }, {});
  const entries = Object.entries(categoryCounts);
  const total = db.items.length;
  if (!total) {
    document.querySelector("#pieChart").style.background = "var(--sage)";
    document.querySelector("#pieLegend").innerHTML = "";
    return;
  }

  const colors = ["#235f46", "#a5c96f", "#f4b446", "#c96d4d", "#6b8f71", "#dce8d7", "#8b6a25"];
  let acc = 0;
  const stops = entries.map(([cat, count], i) => {
    const start = acc;
    acc += (count / total) * 100;
    return `${colors[i % colors.length]} ${start}% ${acc}%`;
  });
  document.querySelector("#pieChart").style.background = `conic-gradient(${stops.join(", ")})`;

  document.querySelector("#pieLegend").innerHTML = entries.map(([cat, count], i) => `
    <div class="pie-legend-item">
      <span class="pie-legend-dot" style="background:${colors[i % colors.length]}"></span>
      <span>${cat}</span>
      <span class="pie-legend-count">${count}</span>
    </div>
  `).join("");
}

function bindExport() {
  document.querySelector("#exportData").addEventListener("click", exportData);
}

function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "campus-secondhand-data.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("数据已导出为 JSON 文件。", "success");
}

function bindTableInteractions() {
  document.addEventListener("click", (event) => {
    const th = event.target.closest("th[data-table]");
    if (th) {
      const tableId = th.dataset.table;
      const col = th.dataset.col;
      if (sortState[tableId] && sortState[tableId].col === col) {
        sortState[tableId].dir = sortState[tableId].dir === "asc" ? "desc" : "asc";
      } else {
        sortState[tableId] = { col, dir: "asc" };
      }
      renderAll();
      return;
    }

    const tr = event.target.closest("tr.clickable");
    if (tr && !event.target.closest("th")) {
      const tableEl = tr.closest("table");
      if (!tableEl) return;
      const headers = [...tableEl.querySelectorAll("thead th")].map((th) => th.textContent.replace(/[▲▼]/g, "").trim());
      const cells = [...tr.querySelectorAll("td")];
      const data = {};
      cells.forEach((td, i) => { if (headers[i]) data[headers[i]] = td.textContent.trim(); });
      showDetailModal(data);
    }
  });

  document.querySelector("#detailClose").addEventListener("click", closeDetailModal);
  document.querySelector("#detailModal").addEventListener("click", (event) => {
    if (event.target === document.querySelector("#detailModal")) closeDetailModal();
  });
}

function showDetailModal(data) {
  const body = document.querySelector("#detailBody");
  const labelMap = {
    item_id: "商品编号", item_name: "商品名称", category: "类别", price: "价格",
    status: "状态", seller_id: "卖家编号", user_id: "用户编号", user_name: "用户名",
    phone: "电话", order_id: "订单编号", buyer_id: "买家编号", order_date: "订单日期",
    purchase_status: "购买状态"
  };
  body.innerHTML = Object.entries(data).map(([key, value]) => {
    const label = labelMap[key] || key;
    let display = value;
    if (key === "status") display = value === "0" || value.includes("0") ? "未售出" : "已售出";
    return `<div class="detail-row"><span>${label}</span><span>${display}</span></div>`;
  }).join("");
  document.querySelector("#detailTitle").textContent = data.item_name || data.user_name || data.order_id || "详细信息";
  document.querySelector("#detailModal").classList.add("visible");
}

function closeDetailModal() {
  document.querySelector("#detailModal").classList.remove("visible");
}

function snapshot(label) {
  return {
    label,
    time: history.length,
    items: db.items.length,
    sold: db.items.filter((i) => i.status === 1).length,
    unsold: db.items.filter((i) => i.status === 0).length,
    orders: db.orders.length
  };
}

function recordSnapshot(label) {
  history.push(snapshot(label));
  if (history.length > 30) history.shift();
}

function getChartPoints(key, maxVal, chartW, chartH, padX, padY) {
  const data = history.map((h) => h[key]);
  if (data.length < 2) return { points: "", dots: [] };
  const max = Math.max(maxVal, 1);
  const stepX = (chartW - padX * 2) / (data.length - 1);
  const dots = data.map((v, i) => ({
    x: padX + i * stepX,
    y: chartH - padY - (v / max) * (chartH - padY * 2),
    val: v,
    idx: i
  }));
  return { points: dots.map((d) => `${d.x},${d.y}`).join(" "), dots };
}

function renderChart() {
  if (history.length < 2) {
    document.querySelector("#trendSvg").innerHTML =
      '<text x="350" y="160" text-anchor="middle" class="chart-label" font-size="14">进行一次操作后将显示趋势图</text>';
    document.querySelector("#chartLegend").innerHTML = "";
    document.querySelector("#chartHistory").innerHTML = "";
    return;
  }

  const svg = document.querySelector("#trendSvg");
  const W = 700, H = 320, PX = 50, PY = 30;

  const maxVal = Math.max(...history.map((h) => Math.max(h.items, h.sold, h.unsold, h.orders)), 1);
  const niceMax = Math.ceil(maxVal / 5) * 5 || 5;
  const gridSteps = 5;

  let svgContent = "";

  for (let i = 0; i <= gridSteps; i++) {
    const y = H - PY - (i / gridSteps) * (H - PY * 2);
    const val = Math.round((i / gridSteps) * niceMax);
    svgContent += `<line x1="${PX}" y1="${y}" x2="${W - PX}" y2="${y}" class="chart-grid-line"/>`;
    svgContent += `<text x="${PX - 10}" y="${y + 4}" text-anchor="end" class="chart-label">${val}</text>`;
  }

  svgContent += `<line x1="${PX}" y1="${H - PY}" x2="${W - PX}" y2="${H - PY}" class="chart-axis"/>`;
  svgContent += `<line x1="${PX}" y1="${PY}" x2="${PX}" y2="${H - PY}" class="chart-axis"/>`;

  history.forEach((h, i) => {
    if (history.length <= 10 || i % Math.ceil(history.length / 10) === 0) {
      const stepX = (W - PX * 2) / (history.length - 1);
      const x = PX + i * stepX;
      svgContent += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="chart-label">${h.label}</text>`;
    }
  });

  chartLines.forEach((line) => {
    const { points, dots } = getChartPoints(line.key, niceMax, W, H, PX, PY);
    if (!points) return;
    svgContent += `<polyline points="${points}" fill="none" stroke="${line.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    dots.forEach((d) => {
      svgContent += `<circle cx="${d.x}" cy="${d.y}" r="4" fill="${line.color}" stroke="#fff" stroke-width="2" class="chart-dot" data-label="${line.label}" data-val="${d.val}" data-step="${history[d.idx]?.label || ""}"/>`;
    });
  });

  svg.innerHTML = svgContent;

  document.querySelector("#chartLegend").innerHTML = chartLines.map((l) =>
    `<div class="chart-legend-item"><span class="chart-legend-line" style="background:${l.color}"></span>${l.label}</div>`
  ).join("");

  document.querySelector("#chartHistory").innerHTML = history.slice(-8).map((h) =>
    `<span class="chart-tag"><span class="chart-tag-dot" style="background:var(--green)"></span>${h.label}</span>`
  ).join("");

  svg.querySelectorAll(".chart-dot").forEach((dot) => {
    dot.addEventListener("mouseenter", (e) => showChartTooltip(e, dot));
    dot.addEventListener("mouseleave", hideChartTooltip);
  });
}

function showChartTooltip(event, dot) {
  let tip = document.querySelector(".chart-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "chart-tooltip";
    document.body.appendChild(tip);
  }
  tip.textContent = `${dot.dataset.label}: ${dot.dataset.val}`;
  tip.classList.add("visible");
  const rect = dot.getBoundingClientRect();
  tip.style.left = rect.left + rect.width / 2 - tip.offsetWidth / 2 + "px";
  tip.style.top = rect.top - tip.offsetHeight - 10 + "px";
}

function hideChartTooltip() {
  const tip = document.querySelector(".chart-tooltip");
  if (tip) tip.classList.remove("visible");
}

recordSnapshot("初始状态");
