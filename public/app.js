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

document.addEventListener("DOMContentLoaded", () => {
  bindScrollButtons();
  bindForms();
  bindViews();
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
  renderView("sold");
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
  document.querySelector("#itemsTable").innerHTML = table(db.items.map(formatItem));
  document.querySelector("#usersTable").innerHTML = table(db.users);
  document.querySelector("#ordersTable").innerHTML = table(db.orders);
}

function formatItem(item) {
  return {
    ...item,
    status: item.status === 1
      ? `<span class="badge sold">1 已售出</span>`
      : `<span class="badge open">0 未售出</span>`
  };
}

function table(rows) {
  if (!rows.length) return `<div class="empty-result"><p>没有查询到数据。</p></div>`;

  const columns = Object.keys(rows[0]);
  const head = columns.map((column) => `<th>${column}</th>`).join("");
  const body = rows.map((row) => {
    const cells = columns.map((column) => `<td>${row[column]}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
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
  document.querySelector("#queryResult").innerHTML = table(query.run(db).map((row) => (
    row.status !== undefined ? formatItem(row) : row
  )));
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
    const rows = db.orders.map((order) => ({
      item_name: findItem(db, order.item_id)?.item_name || "",
      buyer_id: order.buyer_id
    }));
    document.querySelector("#viewTable").innerHTML = table(rows);
    return;
  }

  document.querySelector("#viewTable").innerHTML = table(db.items.filter((item) => item.status === 0).map(formatItem));
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
    saveAndRefresh(`已插入商品 ${data.item_id}。`);
  });

  document.querySelector("#updatePriceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(event.target);
    const item = findItem(db, data.item_id);
    if (!item) return message(`修改失败：商品 ${data.item_id} 不存在。`, true);
    item.price = Number(data.price);
    saveAndRefresh(`已将商品 ${data.item_id} 的价格修改为 ${data.price}。`);
  });

  document.querySelector("#deleteItemForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(event.target);
    const item = findItem(db, data.item_id);
    if (!item) return message(`删除失败：商品 ${data.item_id} 不存在。`, true);
    if (item.status !== 0 || db.orders.some((order) => order.item_id === data.item_id)) {
      return message("删除失败：只能删除未售出的商品。", true);
    }
    db.items = db.items.filter((record) => record.item_id !== data.item_id);
    saveAndRefresh(`已删除未售商品 ${data.item_id}。`);
  });

  document.querySelector("#buyItemForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(event.target);
    buyItem(data);
  });

  document.querySelector("#resetData").addEventListener("click", () => {
    db = clone(initialData);
    saveAndRefresh("已恢复 PDF 中给定的初始数据。");
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
  saveAndRefresh(`购买成功：新增订单 ${data.order_id}，商品 ${data.item_id} 已更新为已售出。`);
}

function saveAndRefresh(text) {
  saveDb();
  renderAll();
  message(text);
}

function message(text, isError = false) {
  const element = document.querySelector("#operationMessage");
  element.textContent = text;
  element.style.color = isError ? "var(--clay)" : "var(--green-dark)";
}

function bindScrollButtons() {
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(button.dataset.scroll).scrollIntoView());
  });
}
