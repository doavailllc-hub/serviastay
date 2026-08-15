const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");

const enabled = process.env.RUN_INTEGRATION_TESTS === "1";
const database = process.env.TEST_DB_NAME || "";

test("property row locking serializes simultaneous booking attempts", { skip: !enabled }, async () => {
  assert.match(database, /(^|_)test($|_)/i, "TEST_DB_NAME must clearly identify a test database");
  const config = {
    host: process.env.TEST_DB_HOST,
    port: Number(process.env.TEST_DB_PORT || 3306),
    user: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    database,
  };
  const setup = await mysql.createConnection(config);
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const properties = `test_properties_${suffix}`;
  const bookings = `test_bookings_${suffix}`;
  try {
    await setup.query(`CREATE TABLE \`${properties}\` (id BIGINT PRIMARY KEY) ENGINE=InnoDB`);
    await setup.query(`CREATE TABLE \`${bookings}\` (id BIGINT AUTO_INCREMENT PRIMARY KEY,property_id BIGINT,checkin DATE,checkout DATE,status VARCHAR(30),INDEX idx_dates(property_id,checkin,checkout,status)) ENGINE=InnoDB`);
    await setup.query(`INSERT INTO \`${properties}\` (id) VALUES (1)`);

    async function attempt() {
      const connection = await mysql.createConnection(config);
      try {
        await connection.beginTransaction();
        await connection.query(`SELECT id FROM \`${properties}\` WHERE id=1 FOR UPDATE`);
        const [existing] = await connection.query(
          `SELECT id FROM \`${bookings}\` WHERE property_id=1 AND status!='Cancelled' AND checkin < '2030-01-05' AND checkout > '2030-01-02' LIMIT 1`
        );
        if (existing.length) { await connection.rollback(); return false; }
        await connection.query(`INSERT INTO \`${bookings}\` (property_id,checkin,checkout,status) VALUES (1,'2030-01-02','2030-01-05','Confirmed')`);
        await connection.commit();
        return true;
      } finally { await connection.end(); }
    }

    const results = await Promise.all([attempt(), attempt()]);
    assert.equal(results.filter(Boolean).length, 1);
  } finally {
    await setup.query(`DROP TABLE IF EXISTS \`${bookings}\``);
    await setup.query(`DROP TABLE IF EXISTS \`${properties}\``);
    await setup.end();
  }
});

test("webhook and refund uniqueness reject duplicate processing", { skip: !enabled }, async () => {
  assert.match(database, /(^|_)test($|_)/i, "TEST_DB_NAME must clearly identify a test database");
  const connection = await mysql.createConnection({
    host: process.env.TEST_DB_HOST, port: Number(process.env.TEST_DB_PORT || 3306),
    user: process.env.TEST_DB_USER, password: process.env.TEST_DB_PASSWORD, database,
  });
  const table = `test_idempotency_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await connection.query(`CREATE TABLE \`${table}\` (id BIGINT AUTO_INCREMENT PRIMARY KEY,event_id VARCHAR(191) NOT NULL,refund_request_id BIGINT NOT NULL,UNIQUE KEY uq_event(event_id),UNIQUE KEY uq_refund(refund_request_id)) ENGINE=InnoDB`);
    await connection.query(`INSERT INTO \`${table}\` (event_id,refund_request_id) VALUES ('evt_1',101)`);
    await assert.rejects(connection.query(`INSERT INTO \`${table}\` (event_id,refund_request_id) VALUES ('evt_1',102)`), (error) => error.code === "ER_DUP_ENTRY");
    await assert.rejects(connection.query(`INSERT INTO \`${table}\` (event_id,refund_request_id) VALUES ('evt_2',101)`), (error) => error.code === "ER_DUP_ENTRY");
  } finally {
    await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
    await connection.end();
  }
});
