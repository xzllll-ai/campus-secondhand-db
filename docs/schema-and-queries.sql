-- 校园二手交易平台数据库系统
-- 可用于 MySQL 8.x。若使用 SQLite，请将 DECIMAL 改为 REAL，并删除 CREATE DATABASE / USE。

CREATE DATABASE IF NOT EXISTS campus_secondhand DEFAULT CHARACTER SET utf8mb4;
USE campus_secondhand;

DROP VIEW IF EXISTS sold_item_view;
DROP VIEW IF EXISTS unsold_item_view;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS item;
DROP TABLE IF EXISTS user;

CREATE TABLE user (
  user_id VARCHAR(10) PRIMARY KEY,
  user_name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE item (
  item_id VARCHAR(10) PRIMARY KEY,
  item_name VARCHAR(80) NOT NULL,
  category VARCHAR(40) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  status TINYINT NOT NULL CHECK (status IN (0, 1)),
  seller_id VARCHAR(10) NOT NULL,
  CONSTRAINT fk_item_seller FOREIGN KEY (seller_id) REFERENCES user(user_id)
);

CREATE TABLE orders (
  order_id VARCHAR(10) PRIMARY KEY,
  item_id VARCHAR(10) NOT NULL UNIQUE,
  buyer_id VARCHAR(10) NOT NULL,
  order_date DATE NOT NULL,
  CONSTRAINT fk_orders_item FOREIGN KEY (item_id) REFERENCES item(item_id),
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES user(user_id)
);

INSERT INTO user (user_id, user_name, phone) VALUES
  ('u001', 'ZhangSan', '13800000001'),
  ('u002', 'LiSi', '13800000002'),
  ('u003', 'WangWu', '13800000003'),
  ('u004', 'ZhaoLiu', '13800000004');

INSERT INTO item (item_id, item_name, category, price, status, seller_id) VALUES
  ('i001', 'CalculusBook', 'Book', 20, 0, 'u001'),
  ('i002', 'DeskLamp', 'DailyGoods', 35, 1, 'u002'),
  ('i003', 'Microcontroller', 'Electronics', 80, 0, 'u001'),
  ('i004', 'Chair', 'Furniture', 50, 1, 'u003'),
  ('i005', 'WaterBottle', 'DailyGoods', 15, 0, 'u004');

INSERT INTO orders (order_id, item_id, buyer_id, order_date) VALUES
  ('o001', 'i002', 'u001', '2024-05-01'),
  ('o002', 'i004', 'u002', '2024-05-03');

-- 数据操作
INSERT INTO item (item_id, item_name, category, price, status, seller_id)
VALUES ('i006', 'Notebook', 'Book', 28, 0, 'u003');

UPDATE item SET price = 75 WHERE item_id = 'i003';

DELETE FROM item
WHERE item_id = 'i005'
  AND status = 0
  AND item_id NOT IN (SELECT item_id FROM orders);

-- 基本查询
SELECT * FROM item WHERE status = 0;
SELECT * FROM item WHERE price > 30;
SELECT * FROM item WHERE category = 'DailyGoods';
SELECT * FROM item WHERE seller_id = 'u001';

-- 连接查询
SELECT item.item_id, item.item_name, user.user_name AS buyer_name
FROM item
JOIN orders ON item.item_id = orders.item_id
JOIN user ON orders.buyer_id = user.user_id
WHERE item.status = 1;

SELECT orders.order_id, item.item_name, user.user_name AS buyer_name, orders.order_date
FROM orders
JOIN item ON orders.item_id = item.item_id
JOIN user ON orders.buyer_id = user.user_id;

SELECT item.item_id, item.item_name,
       CASE WHEN orders.order_id IS NULL THEN '未购买' ELSE '已购买' END AS purchase_status
FROM item
LEFT JOIN orders ON item.item_id = orders.item_id
WHERE item.seller_id = 'u001';

-- 聚合与分组
SELECT COUNT(*) AS item_total FROM item;
SELECT category, COUNT(*) AS category_count FROM item GROUP BY category;
SELECT AVG(price) AS avg_price FROM item;
SELECT user.user_id, user.user_name, COUNT(item.item_id) AS item_count
FROM user
LEFT JOIN item ON user.user_id = item.seller_id
GROUP BY user.user_id, user.user_name
ORDER BY item_count DESC
LIMIT 1;

-- 视图
CREATE VIEW sold_item_view AS
SELECT item.item_name, orders.buyer_id
FROM item
JOIN orders ON item.item_id = orders.item_id
WHERE item.status = 1;

CREATE VIEW unsold_item_view AS
SELECT * FROM item WHERE status = 0;

SELECT * FROM sold_item_view;
SELECT * FROM unsold_item_view;

-- 购买商品业务逻辑：用事务保证新增订单和修改状态同时成功或失败
START TRANSACTION;

SELECT status
FROM item
WHERE item_id = 'i001'
FOR UPDATE;

INSERT INTO orders (order_id, item_id, buyer_id, order_date)
SELECT 'o003', 'i001', 'u002', '2024-05-08'
FROM item
WHERE item_id = 'i001'
  AND status = 0
  AND NOT EXISTS (SELECT 1 FROM orders WHERE item_id = 'i001');

UPDATE item
SET status = 1
WHERE item_id = 'i001'
  AND status = 0
  AND EXISTS (SELECT 1 FROM orders WHERE order_id = 'o003');

COMMIT;
