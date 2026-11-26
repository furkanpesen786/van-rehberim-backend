"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express4 = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_cors = __toESM(require("cors"), 1);
var import_compression = __toESM(require("compression"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);

// server/listings.ts
var import_express2 = require("express");
var import_axios = __toESM(require("axios"), 1);
var import_auth = require("firebase-admin/auth");
var import_firestore2 = require("firebase-admin/firestore");

// server/adminApp.ts
var import_app = require("firebase-admin/app");
var FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
var FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || "";
var FIREBASE_PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
var FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || "";
function buildCredential() {
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return (0, import_app.cert)({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY
    });
  }
  if (FIREBASE_SERVICE_ACCOUNT) {
    return (0, import_app.cert)(JSON.parse(FIREBASE_SERVICE_ACCOUNT));
  }
  return null;
}
var cachedAdminApp = null;
function getAdminApp() {
  if (cachedAdminApp) return cachedAdminApp;
  if ((0, import_app.getApps)().length > 0) {
    cachedAdminApp = (0, import_app.getApps)()[0];
    return cachedAdminApp;
  }
  try {
    const credential = buildCredential();
    if (!credential) return null;
    cachedAdminApp = (0, import_app.initializeApp)({ credential });
    return cachedAdminApp;
  } catch (err) {
    console.error("[admin] Firebase y\xF6netim kimlik bilgileri \xE7\xF6z\xFCmlenemedi:", err);
    return null;
  }
}

// server/publicData.ts
var import_express = require("express");
var import_firestore = require("firebase-admin/firestore");

// server/cacheService.ts
var import_node_cache = __toESM(require("node-cache"), 1);
var PUBLIC_DATA_CACHE_TTL_SECONDS = 300;
var PUBLIC_DATA_CACHE_MAX_KEYS = 500;
var publicDataCache = new import_node_cache.default({
  stdTTL: PUBLIC_DATA_CACHE_TTL_SECONDS,
  maxKeys: PUBLIC_DATA_CACHE_MAX_KEYS,
  // Süresi geçmiş anahtarları arka planda temizle
  checkperiod: 120
});
var CACHE_KEYS = {
  jobs: "v1:jobs",
  deals: "v1:deals",
  taxis: "v1:taxis"
};

// src/utils/listingSort.ts
function listingTimestampMillis(value) {
  if (!value || typeof value !== "object") return 0;
  const v = value;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1e3;
  if (typeof v.seconds === "string" && v.seconds.trim() !== "") {
    const parsed = Number(v.seconds);
    if (Number.isFinite(parsed)) return parsed * 1e3;
  }
  return 0;
}
function sortByNewestFirst(items, getTimestamp) {
  return [...items].sort(
    (a, b) => listingTimestampMillis(getTimestamp(b)) - listingTimestampMillis(getTimestamp(a))
  );
}

// server/publicData.ts
var publicDataRouter = (0, import_express.Router)();
var LISTING_ENDPOINTS = {
  jobs: { cacheKey: CACHE_KEYS.jobs, collection: "is_ilanlari", responseField: "jobs" },
  deals: { cacheKey: CACHE_KEYS.deals, collection: "indirim_ilanlari", responseField: "deals" },
  taxis: { cacheKey: CACHE_KEYS.taxis, collection: "taksiler", responseField: "taxis" }
};
function invalidatePublicDataCache(collection) {
  const entry = Object.values(LISTING_ENDPOINTS).find((c) => c.collection === collection);
  if (!entry) return false;
  return publicDataCache.del(entry.cacheKey) > 0;
}
async function handleListingRequest(kind, _req, res) {
  const cfg = LISTING_ENDPOINTS[kind];
  const cached = publicDataCache.get(cfg.cacheKey);
  if (cached !== void 0) {
    res.set("X-Cache", "HIT");
    res.json({ success: true, count: cached.length, [cfg.responseField]: cached });
    return;
  }
  const adminApp = getAdminApp();
  if (!adminApp) {
    res.status(503).json({
      error: "Sunucu veritaban\u0131 y\xF6netim eri\u015Fimi yap\u0131land\u0131r\u0131lmam\u0131\u015F (FIREBASE_SERVICE_ACCOUNT eksik)."
    });
    return;
  }
  try {
    const snapshot = await (0, import_firestore.getFirestore)(adminApp).collection(cfg.collection).where("bitisTarihi", ">", import_firestore.Timestamp.now()).get();
    const items = sortByNewestFirst(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
      (item) => item.createdAtTimestamp
    );
    publicDataCache.set(cfg.cacheKey, items);
    res.set("X-Cache", "MISS");
    res.json({ success: true, count: items.length, [cfg.responseField]: items });
  } catch (err) {
    console.error(`[publicData] ${cfg.collection} okunamad\u0131:`, err);
    res.status(502).json({ error: "\u0130lanlar \u015Fu anda al\u0131namad\u0131. L\xFCtfen tekrar deneyiniz." });
  }
}
publicDataRouter.get("/jobs", (req, res) => {
  void handleListingRequest("jobs", req, res);
});
publicDataRouter.get("/deals", (req, res) => {
  void handleListingRequest("deals", req, res);
});
publicDataRouter.get("/taxis", (req, res) => {
  void handleListingRequest("taxis", req, res);
});
var CACHE_INVALIDATION_SECRET = process.env.CACHE_INVALIDATION_SECRET || "";
publicDataRouter.post("/cache/clear", (req, res) => {
  if (!CACHE_INVALIDATION_SECRET) {
    res.status(503).json({
      error: "\xD6nbellek temizleme yap\u0131land\u0131r\u0131lmam\u0131\u015F (CACHE_INVALIDATION_SECRET eksik)."
    });
    return;
  }
  const provided = req.get("x-invalidation-secret");
  if (!provided || provided !== CACHE_INVALIDATION_SECRET) {
    res.status(401).json({ error: "Yetkisiz istek." });
    return;
  }
  const cleared = publicDataCache.del([CACHE_KEYS.jobs, CACHE_KEYS.deals, CACHE_KEYS.taxis]);
  console.log(`[publicData] manuel \xF6nbellek temizli\u011Fi: ${cleared} anahtar silindi`);
  res.json({ ok: true, cleared });
});

// server/listings.ts
var listingsRouter = (0, import_express2.Router)();
var RC_SECRET_API_KEY = process.env.REVENUECAT_SECRET_API_KEY || "";
var PRODUCT_META = {
  "ilan_30_gun": { durationDays: 30, isFeatured: false },
  "one_cikan_30_gun": { durationDays: 30, isFeatured: true },
  "taksi_ilan_aylik": { durationDays: 30, isFeatured: false }
};
var LISTING_TYPES = {
  job: {
    collection: "is_ilanlari",
    allowedProducts: ["ilan_30_gun", "one_cikan_30_gun"],
    fields: [
      "title",
      "providerName",
      "category",
      "district",
      "address",
      "phone",
      "description",
      "photo",
      "experienceYears",
      "pricePaid"
    ]
  },
  deal: {
    collection: "indirim_ilanlari",
    allowedProducts: ["ilan_30_gun", "one_cikan_30_gun"],
    fields: [
      "isletmeAdi",
      "kategori",
      "indirimKodu",
      "indirimDegeri",
      "indirimMetni",
      "image",
      "images",
      "phone",
      "locationName",
      "description",
      "pricePaid"
    ]
  },
  taxi: {
    collection: "taksiler",
    allowedProducts: ["taksi_ilan_aylik"],
    fields: [
      "name",
      "driverName",
      "phone",
      "plate",
      "operatingRegions",
      "district",
      "subscriptionPlan",
      "monthlyFee",
      "pricePaid"
    ]
  }
};
var PURCHASE_FRESHNESS_MS = 15 * 60 * 1e3;
var SUBSCRIBER_CACHE_TTL_MS = 60 * 1e3;
var RATE_LIMIT_MAX_PER_HOUR = 10;
var MAX_FIELD_LENGTH = 5e3;
var IMAGE_FIELDS = /* @__PURE__ */ new Set(["image", "photo"]);
var IMAGE_LIST_FIELDS = /* @__PURE__ */ new Set(["images"]);
var MAX_IMAGE_FIELD_LENGTH = 15e4;
var MAX_IMAGE_COUNT = 5;
var subscriberCache = /* @__PURE__ */ new Map();
async function fetchRevenueCatSubscriber(uid) {
  const cached = subscriberCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const response = await import_axios.default.get(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`,
    {
      headers: {
        Authorization: `Bearer ${RC_SECRET_API_KEY}`,
        "X-Platform": "android"
      },
      timeout: 15e3,
      validateStatus: (status) => status === 200 || status === 404
    }
  );
  if (response.status === 404) return null;
  const subscriber = response.data?.subscriber ?? {};
  subscriberCache.set(uid, { data: subscriber, expiresAt: Date.now() + SUBSCRIBER_CACHE_TTL_MS });
  return subscriber;
}
function isEntitlementActive(ent) {
  if (!ent.expires_date) return true;
  return new Date(ent.expires_date).getTime() > Date.now();
}
function hasValidPurchase(subscriber, productId) {
  if (!subscriber) return false;
  for (const ent of Object.values(subscriber.entitlements || {})) {
    if (ent && ent.product_identifier === productId && isEntitlementActive(ent)) {
      return true;
    }
  }
  const purchases = subscriber.non_subscriptions?.[productId] || [];
  const now = Date.now();
  return purchases.some((p) => {
    if (!p.purchase_date) return false;
    return now - new Date(p.purchase_date).getTime() <= PURCHASE_FRESHNESS_MS;
  });
}
var rateLimiter = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW_MS = 60 * 60 * 1e3;
var rateLimiterLastPrune = 0;
function pruneRateLimiter(now) {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  for (const [uid, stamps] of rateLimiter) {
    const fresh = stamps.filter((t) => t > windowStart);
    if (fresh.length === 0) {
      rateLimiter.delete(uid);
    } else if (fresh.length !== stamps.length) {
      rateLimiter.set(uid, fresh);
    }
  }
}
function isRateLimited(uid) {
  const now = Date.now();
  if (now - rateLimiterLastPrune > 60 * 1e3) {
    rateLimiterLastPrune = now;
    pruneRateLimiter(now);
  }
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const stamps = (rateLimiter.get(uid) || []).filter((t) => t > windowStart);
  if (stamps.length >= RATE_LIMIT_MAX_PER_HOUR) {
    rateLimiter.set(uid, stamps);
    return true;
  }
  stamps.push(now);
  rateLimiter.set(uid, stamps);
  return false;
}
function pickFields(data, fields) {
  const out = {};
  for (const key of fields) {
    const value = data[key];
    if (value === void 0 || value === null) continue;
    if (typeof value === "string") {
      const limit = IMAGE_FIELDS.has(key) ? MAX_IMAGE_FIELD_LENGTH : MAX_FIELD_LENGTH;
      out[key] = value.slice(0, limit);
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (Array.isArray(value) && IMAGE_LIST_FIELDS.has(key)) {
      out[key] = value.filter((item) => typeof item === "string" && item.length > 0).slice(0, MAX_IMAGE_COUNT).map((item) => item.slice(0, MAX_IMAGE_FIELD_LENGTH));
    }
  }
  return out;
}
function todayTR() {
  return (/* @__PURE__ */ new Date()).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
listingsRouter.post("/", async (req, res) => {
  try {
    if (!RC_SECRET_API_KEY) {
      return res.status(503).json({
        error: "Sunucu \xF6deme do\u011Frulamas\u0131 yap\u0131land\u0131r\u0131lmam\u0131\u015F (REVENUECAT_SECRET_API_KEY eksik)."
      });
    }
    const adminApp = getAdminApp();
    if (!adminApp) {
      return res.status(503).json({
        error: "Sunucu veritaban\u0131 y\xF6netim eri\u015Fimi yap\u0131land\u0131r\u0131lmam\u0131\u015F (FIREBASE_SERVICE_ACCOUNT eksik)."
      });
    }
    const { type, productId, data } = req.body || {};
    const typeConfig = LISTING_TYPES[type];
    if (!typeConfig || typeof productId !== "string" || !data || typeof data !== "object") {
      return res.status(400).json({ error: "Ge\xE7ersiz istek." });
    }
    const meta = PRODUCT_META[productId];
    if (!meta || !typeConfig.allowedProducts.includes(productId)) {
      return res.status(400).json({ error: "Bu ilan tipi i\xE7in ge\xE7ersiz paket." });
    }
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Oturum do\u011Frulanamad\u0131. L\xFCtfen giri\u015F yap\u0131n\u0131z." });
    }
    let decoded;
    try {
      decoded = await (0, import_auth.getAuth)(adminApp).verifyIdToken(token, true);
    } catch {
      return res.status(401).json({ error: "Oturum do\u011Frulanamad\u0131. L\xFCtfen tekrar giri\u015F yap\u0131n\u0131z." });
    }
    const uid = decoded.uid;
    if (isRateLimited(uid)) {
      return res.status(429).json({ error: "\xC7ok fazla istek g\xF6nderildi. L\xFCtfen bir s\xFCre sonra tekrar deneyiniz." });
    }
    let subscriber = null;
    try {
      subscriber = await fetchRevenueCatSubscriber(uid);
    } catch (err) {
      console.error("[listings] RevenueCat sorgusu ba\u015Far\u0131s\u0131z:", err);
      return res.status(502).json({ error: "\xD6deme bilgisi do\u011Frulanamad\u0131. L\xFCtfen k\u0131sa s\xFCre sonra tekrar deneyiniz." });
    }
    if (!hasValidPurchase(subscriber, productId)) {
      return res.status(403).json({
        error: "\xD6deme do\u011Frulanamad\u0131. \xD6demeniz tamamland\u0131ysa k\u0131sa s\xFCre sonra tekrar deneyiniz."
      });
    }
    const now = /* @__PURE__ */ new Date();
    const endDate = new Date(now.getTime() + meta.durationDays * 24 * 60 * 60 * 1e3);
    const rawTransactionId = data.transactionId;
    const transactionId = typeof rawTransactionId === "string" && rawTransactionId.trim().length > 0 ? rawTransactionId.trim().slice(0, 128) : void 0;
    const docData = {
      ...pickFields(data, typeConfig.fields),
      userId: uid,
      userEmail: decoded.email || "anonim@van.rehberim",
      productId,
      durationDays: meta.durationDays,
      isFeatured: meta.isFeatured,
      // Aşama 4: ödeme durumu ve sağlayıcı İSTEMCİDEN ALINMAZ — ödemeyi
      // doğrulayan katman (bu endpoint) sabitler; istemci "paid" yazamaz.
      paymentStatus: "paid",
      paymentProvider: "revenuecat",
      ...transactionId !== void 0 ? { transactionId } : {},
      createdAt: todayTR(),
      createdAtTimestamp: import_firestore2.FieldValue.serverTimestamp(),
      bitisTarihi: import_firestore2.Timestamp.fromDate(endDate)
    };
    if (type === "deal") {
      docData.startDate = todayTR();
      docData.endDate = endDate.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    const docRef = await (0, import_firestore2.getFirestore)(adminApp).collection(typeConfig.collection).add(docData);
    try {
      invalidatePublicDataCache(typeConfig.collection);
    } catch {
      console.warn("[listings] \xF6nbellek invalidasyonu yap\u0131lamad\u0131 (kritik de\u011Fil)");
    }
    return res.status(201).json({ ok: true, id: docRef.id, durationDays: meta.durationDays });
  } catch (err) {
    console.error("[listings] beklenmeyen hata:", err);
    return res.status(500).json({ error: "\u0130lan yay\u0131mlanamad\u0131. L\xFCtfen tekrar deneyiniz." });
  }
});

// server/account.ts
var import_express3 = require("express");
var import_auth2 = require("firebase-admin/auth");
var import_firestore3 = require("firebase-admin/firestore");
var accountRouter = (0, import_express3.Router)();
var USER_LISTING_COLLECTIONS = ["is_ilanlari", "indirim_ilanlari", "taksiler"];
var RATE_LIMIT_MAX_PER_HOUR2 = 5;
var RATE_LIMIT_WINDOW_MS2 = 60 * 60 * 1e3;
var rateLimiter2 = /* @__PURE__ */ new Map();
var rateLimiterLastPrune2 = 0;
function isRateLimited2(uid) {
  const now = Date.now();
  if (now - rateLimiterLastPrune2 > 60 * 1e3) {
    rateLimiterLastPrune2 = now;
    const windowStart2 = now - RATE_LIMIT_WINDOW_MS2;
    for (const [key, stamps2] of rateLimiter2) {
      const fresh = stamps2.filter((t) => t > windowStart2);
      if (fresh.length === 0) rateLimiter2.delete(key);
      else rateLimiter2.set(key, fresh);
    }
  }
  const windowStart = now - RATE_LIMIT_WINDOW_MS2;
  const stamps = (rateLimiter2.get(uid) || []).filter((t) => t > windowStart);
  if (stamps.length >= RATE_LIMIT_MAX_PER_HOUR2) {
    rateLimiter2.set(uid, stamps);
    return true;
  }
  stamps.push(now);
  rateLimiter2.set(uid, stamps);
  return false;
}
async function deleteAllUserDataAndAccount(adminApp, uid) {
  const db = (0, import_firestore3.getFirestore)(adminApp);
  await db.doc(`users/${uid}`).delete();
  await db.doc(`userFavorites/${uid}`).delete();
  for (const collName of USER_LISTING_COLLECTIONS) {
    const snapshot = await db.collection(collName).where("userId", "==", uid).get();
    await Promise.all(snapshot.docs.map((d) => d.ref.delete()));
  }
  await (0, import_auth2.getAuth)(adminApp).deleteUser(uid);
}
accountRouter.post("/delete", async (req, res) => {
  try {
    const adminApp = getAdminApp();
    if (!adminApp) {
      return res.status(503).json({
        error: "Sunucu veritaban\u0131 y\xF6netim eri\u015Fimi yap\u0131land\u0131r\u0131lmam\u0131\u015F (FIREBASE_SERVICE_ACCOUNT eksik)."
      });
    }
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Oturum do\u011Frulanamad\u0131. L\xFCtfen giri\u015F yap\u0131n\u0131z." });
    }
    let uid;
    try {
      const decoded = await (0, import_auth2.getAuth)(adminApp).verifyIdToken(token, true);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: "Oturum do\u011Frulanamad\u0131. L\xFCtfen tekrar giri\u015F yap\u0131n\u0131z." });
    }
    if (isRateLimited2(uid)) {
      return res.status(429).json({ error: "\xC7ok fazla deneme yap\u0131ld\u0131. L\xFCtfen bir s\xFCre sonra tekrar deneyiniz." });
    }
    await deleteAllUserDataAndAccount(adminApp, uid);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[account] hesap silme hatas\u0131:", err);
    return res.status(500).json({ error: "Hesap silinirken sunucu hatas\u0131 olu\u015Ftu. L\xFCtfen tekrar deneyiniz." });
  }
});

// src/data/busSnapshot.ts
var BUS_SNAPSHOT_LAST_UPDATED = "15.11.2026 13:33";
var BUS_SNAPSHOT_ROUTES = [
  { "id": "v-live-120", "lineNo": "32-\u0130B", "title": "32-\u0130B - \u0130SKELE MAHALLES\u0130-B\xD6LGE HASTANES\u0130", "route": "\u0130skele-\u0130skele Caddesi-Tebrizkap\u0131 Caddesi-Atat\xFCrk K\xFClt\xFCr Park\u0131-Melen Caddesi-\u0130pekyolu Bulvar\u0131-B\xF6lge Hastanesi", "departureTimes": ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00"], "returnTimes": ["08:00", "10:00", "12:00", "14:00", "16:00", "17:45"], "stops": ["\u0130skele", "\u0130skele Caddesi", "Tebrizkap\u0131 Caddesi", "Atat\xFCrk K\xFClt\xFCr Park\u0131", "Melen Caddesi", "\u0130pekyolu Bulvar\u0131", "B\xF6lge Hastanesi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:00" },
  { "id": "v-live-121", "lineNo": "42-A", "title": "42-A - HACIBEK\u0130R-\u015EABAN\u0130YE MAH.B\xD6LGE HAST.", "route": "Depolama alan\u0131-Do\u011Fu Caddesi-Sebze Hali-\u015Eabaniye Caddesi-\u0130pekyolu Bulvar\u0131-B\xF6lge Hastanesi", "departureTimes": ["08:30", "10:30", "12:30", "14:30", "16:30", "18:30 ARIZALI"], "returnTimes": ["07:35", "09:30", "11:30", "13:30", "15:30", "17:30"], "stops": ["Depolama alan\u0131", "Do\u011Fu Caddesi", "Sebze Hali", "\u015Eabaniye Caddesi", "\u0130pekyolu Bulvar\u0131", "B\xF6lge Hastanesi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "08:30 - 18:30" },
  { "id": "v-live-122", "lineNo": "42-B", "title": "42-B - HACIBEK\u0130R-\u015EABAN\u0130YE ESK\u0130 EDREM\u0130T YOLU B\xD6LGE HAST.", "route": "B\xF6lge Hastanesi-\u0130pekyolu Bulvar\u0131-Hasanbey Caddesi-\u015Eabaniye Mezarl\u0131\u011F\u0131-Eski Edremit Yolu Caddesi-Sebze Hali-Do\u011Fu Caddesi-\u015Eerefiye Caddesi-Depolama Alan\u0131", "departureTimes": ["06:30", "08:30", "10:30", "12:30", "14:30", "16:30"], "returnTimes": ["07:30", "09:30", "11:30", "13:30", "15:30", "17:30"], "stops": ["B\xF6lge Hastanesi", "\u0130pekyolu Bulvar\u0131", "Hasanbey Caddesi", "\u015Eabaniye Mezarl\u0131\u011F\u0131", "Eski Edremit Yolu Caddesi", "Sebze Hali", "Do\u011Fu Caddesi", "\u015Eerefiye Caddesi", "Depolama Alan\u0131"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 16:30" },
  { "id": "v-live-123", "lineNo": "112", "title": "112 - EDREM\u0130T-\xC7\u0130\xC7EKL\u0130-K\xD6PR\xDCLER MAH.-\xC7AYIRBA\u015EI", "route": "\xC7ay\u0131rba\u015F\u0131-K\xF6pr\xFCler Mah.-\xC7i\xE7ekli Sa\u011Fl\u0131k Oca\u011F\u0131-Edremit-B\xF6lge Hastanesi-\u0130pekyolu Bulvar\u0131-Eski Emniyet Kav\u015Fa\u011F\u0131-S\u0131hke Caddesi-Be\u015Fyol-\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["06:30 K\xDCME EVLER", "08:30 K\xDCME EVLER\u0130", "10:15", "12:00 (", "14:30", "16:30", "17:45", "20:00"], "returnTimes": ["07:00", "08:15", "10:15", "12:30", "14:45", "16:00", "18:15 K\xDCME EVLER\u0130", "20:00"], "stops": ["\xC7ay\u0131rba\u015F\u0131", "K\xF6pr\xFCler Mah.", "\xC7i\xE7ekli Sa\u011Fl\u0131k Oca\u011F\u0131", "Edremit", "B\xF6lge Hastanesi", "\u0130pekyolu Bulvar\u0131", "Eski Emniyet Kav\u015Fa\u011F\u0131", "S\u0131hke Caddesi", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 8 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 20:00" },
  { "id": "v-live-124", "lineNo": "113", "title": "113 - EDREM\u0130T-\xC7\u0130\xC7EKL\u0130-D\u0130LKAYA-K\xD6\u015EK-M\xDCLK-ANDA\xC7-U\u011EURVEREN-ENG\u0130NSU-BAKIMLI MAH.", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol Halk E\u011Fitim Merkezi-s\u0131hke Caddesi-Eski Emniyet Kav.-\u0130pekyolu Bulvar\u0131-B\xF6lge Hastanesi-Edremit- \xC7i\xE7ekli Sa\u011Fl\u0131k Oca\u011F\u0131- Anda\xE7-U\u011Furveren-Enginsu-M\xFClk Mah.", "departureTimes": ["09:00", "14:00", "17:15"], "returnTimes": ["06:30", "10:30", "15:30"], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol Halk E\u011Fitim Merkezi", "s\u0131hke Caddesi", "Eski Emniyet Kav.", "\u0130pekyolu Bulvar\u0131", "B\xF6lge Hastanesi", "Edremit", "\xC7i\xE7ekli Sa\u011Fl\u0131k Oca\u011F\u0131", "Anda\xE7", "U\u011Furveren", "Enginsu", "M\xFClk Mah."], "frequency": "G\xFCnde 3 sefer", "status": "Aktif", "tariff": "", "operatingHours": "09:00 - 17:15" },
  { "id": "v-live-126", "lineNo": "E-1", "title": "E-1 - EDREM\u0130T YEN\u0130 TOK\u0130-K\u0130RACILAR TOK\u0130-ESK\u0130 TOK\u0130-Y.Y.\xDC EKSPRES HATTI", "route": "Edremit Yeni Toki-Kirac\u0131lar Toki- Eski Toki-Nur Tatar Spor Salonu-\u0130pekyolu Caddesi-Kocaeli Park\u0131- B\xF6lge Hastanesi- Eski Emniyet Kav\u015Fa\u011F\u0131-Otogar Kav\u015Fa\u011F\u0131- Erci\u015F Yolu \xDCzeri-Oto Sanayi Kav\u015Fa\u011F\u0131-YY\xDC Ara\u015Ft\u0131rma Hastanesi", "departureTimes": ["06:20", "07:00", "07:15 EK ARA\xC7 K\u0130RACILAR TOK\u0130 GEBZE SU SPORLARI", "08:00", "09:00", "09:30 EK ARA\xC7. GEBZE SU SPORLARI", "10:20", "11:00", "11:30 EK ARA\xC7 GEBZE SU SPORLARI", "12:20", "13:00", "13:30 EK ARA\xC7 GEBZE SU SPORLARI", "14:20", "15:00", "15:30 EK ARA\xC7 GEBZE SU SPORLARI", "16:20", "17:00", "17:30 EK ARA\xC7. GEBZE SU SPORLARI", "18:30"], "returnTimes": ["06:20", "07:00", "07:30 EK ARA\xC7 GEBZE SU SPORLARI", "08:00", "09:00", "09:30 EK ARA\xC7 GEBZE SU SPORLARI", "10:20", "11:00", "11:30 EK ARA\xC7 GEBZE SU SPORLARI", "12:20", "13:00", "13:30 EK ARA\xC7 GEBZE SU SPORLAR", "14:20", "15:00", "15:30 EK ARA\xC7 GEBZE SU SPORLARI", "16:20", "17:00", "17:30 EK ARA\xC7 GEBZE SU SPORLARI", "18:30", "19:00"], "stops": ["Edremit Yeni Toki", "Kirac\u0131lar Toki", "Eski Toki", "Nur Tatar Spor Salonu", "\u0130pekyolu Caddesi", "Kocaeli Park\u0131", "B\xF6lge Hastanesi", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Otogar Kav\u015Fa\u011F\u0131", "Erci\u015F Yolu \xDCzeri", "Oto Sanayi Kav\u015Fa\u011F\u0131", "YY\xDC Ara\u015Ft\u0131rma Hastanesi"], "frequency": "G\xFCnde 19 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:20 - 18:30" },
  { "id": "v-live-129", "lineNo": "121", "title": "121 - EDREM\u0130T YEN\u0130 TOK\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi-\xC7ohaz Petrol-K\xFClt\xFCr Saray\u0131-Hayat Hastanesi-Van Avm Kav\u015Fa\u011F\u0131-\u0130kinisan Caddesi-Terzio\u011Flu Kav\u015Fa\u011F\u0131-B\xF6lge Hastanesi-\u0130pekyolu Caddesi-Nur Tatar Spor Salonu-Yeni Toki", "departureTimes": ["06:30 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "06:50 YEN\u0130 TOK\u0130 400 EVLER", "07:20", "07:50 YEN\u0130 TOK\u0130 400 EVLER", "08:10 YEN\u0130 TOK\u0130 400 EVLER", "08:30 EK ARA\xC7", "08:40", "09:10 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "09:30 YEN\u0130 TOK\u0130 400 EVLER", "10:00", "10:30 YEN\u0130 TOK\u0130 400 EVLER", "11:00 YEN\u0130 TOK\u0130 400 EVLER", "11:30", "12:15 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "12:45 YEN\u0130 TOK\u0130 400 EVLER", "13:00 EK ARA\xC7", "13:15", "14:00 YEN\u0130 TOK\u0130 400 EVLER", "14:30 YEN\u0130 TOK\u0130 400 EVLER", "15:00", "15:45 PAZAR G\xDCNLER\u0130 TOPLUTA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "16:15 YEN\u0130 TOK\u0130 400 EVLER", "16:45 EK ARA\xC7", "17:00", "17:30 YEN\u0130 TOK\u0130 400 EVLER", "18:00 YEN\u0130 TOK\u0130 400 EVLER", "18:45", "19:15 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "19:45 YEN\u0130 TOK\u0130 400 EVLER", "20:15", "20:45 YEN\u0130 TOK\u0130 400 EVLER", "21:30", "22:00 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "22:30 YEN\u0130 TOK\u0130 400 EVLER", "23:00"], "returnTimes": ["06:30 YEN\u0130 TOK\u0130 400 EVLER", "06:50 YEN\u0130 TOK\u0130 400 EVLER", "07:10 EK ARA\xC7", "07:20", "07:50 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "08:10 YEN\u0130 TOK\u0130 400 EVLER", "08:40", "09:10 YEN\u0130 TOK\u0130 400 EVLER", "09:30 YEN\u0130 TOK\u0130 400 EVLER", "10:00", "10:15 EK ARA\xC7", "10:30 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "11:00 YEN\u0130 TOK\u0130 400 EVLER", "11:30", "12:15 YEN\u0130 TOK\u0130 400 EVLER", "12:45 YEN\u0130 TOK\u0130 400 EVLER", "13:15", "14:00 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "14:30 YEN\u0130 TOK\u0130 400 EVLER", "14:45 EK ARA\xC7", "15:15", "15:45 YEN\u0130 TOK\u0130 400 EVLER", "16:15 YEN\u0130 TOK\u0130 400 EVLER", "17:00", "17:30 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "18:00 YEN\u0130 TOK\u0130 400 EVLER", "18:45", "19:15 YEN\u0130 TOK\u0130 400 EVLER", "19:45 YEN\u0130 TOK\u0130 400 EVLER", "20:15", "20:45 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "21:15 YEN\u0130 TOK\u0130 400 EVLER", "21:30", "22:00 YEN\u0130 TOK\u0130 400 EVLER"], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "\xC7ohaz Petrol", "K\xFClt\xFCr Saray\u0131", "Hayat Hastanesi", "Van Avm Kav\u015Fa\u011F\u0131", "\u0130kinisan Caddesi", "Terzio\u011Flu Kav\u015Fa\u011F\u0131", "B\xF6lge Hastanesi", "\u0130pekyolu Caddesi", "Nur Tatar Spor Salonu", "Yeni Toki"], "frequency": "G\xFCnde 35 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 23:00" },
  { "id": "v-live-131", "lineNo": "131", "title": "131 - EDREM\u0130T ESK\u0130 TOK\u0130-K\u0130RACILAR TOK\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi-\xC7ohaz Petrol-Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-\u0130skele Caddesi-Yeniyol Kav\u015Fa\u011F\u0131-S\u0131hke Caddesi-Eski Emniyet Kav\u015Fa\u011F\u0131-Terzio\u011Flu Kav\u015Fa\u011F\u0131-B\xF6lge Hastanesi-\u0130pekyolu Caddesi-Kocaeli Park\u0131-Eski Toki-Kirac\u0131lar Toki", "departureTimes": ["06:30 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "06:50 GEBZE SU SPORLARI", "07:20", "07:50", "08:10 GEBZE SU SPORLARI", "08:30 EK ARA\xC7", "08:40", "09:10 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "09:30 GEBZE SU SPORLARI", "10:00", "10:30", "11:00 GEBZE SU SPORLARI", "11:30", "12:15 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "12:30 EK ARA\xC7", "12:45 GEBZE SU SPORLARI", "13:15", "14:00", "14:30 GEBZE SU SPORLARI", "15:00", "15:15 EK ARA\xC7", "15:45 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "16:15 GEBZE SU SPORLARI", "17:00", "17:30", "18:00 GEBZE SU SPORLARI", "18:45", "19:15 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "19:45 GEBZE SU SPORLARI", "20:15", "20:45", "22:00 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "22:30 GEBZE SU SPORLARI", "23:00"], "returnTimes": ["06:30", "06:50 GEBZE SU SPORLARI", "07:00 EK ARA\xC7", "07:20", "07:50 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "08:10 GEBZE SU SPORLARI", "08:40", "09:10", "09:30 GEBZE SU SPORLARI", "10:00", "10:15 EK ARA\xC7", "10:30 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "11:00 GEBZE SU SPORLARI", "11:30", "12:15", "12:45 GEBZE SU SPORLARI", "13:15", "13:45 EK ARA\xC7", "14:00 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "14:30 GEBZE SU SPORLARI", "15:15", "15:45", "16:15 GEBZE SU SPORLARI", "16:30 EK ARA\xC7", "17:00", "17:30 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "18:00 GEBZE SU SPORLARI", "18:45", "19:15", "19:45 GEBZE SU SPORLARI", "20:15", "20:45 PAZAR G\xDCNLER\u0130 TOPLU TA\u015EIMA H\u0130ZMET\u0130 VERMEMEKTED\u0130R", "21:30 GEBZE SU SPORLARI", "22:00"], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "\xC7ohaz Petrol", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "\u0130skele Caddesi", "Yeniyol Kav\u015Fa\u011F\u0131", "S\u0131hke Caddesi", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Terzio\u011Flu Kav\u015Fa\u011F\u0131", "B\xF6lge Hastanesi", "\u0130pekyolu Caddesi", "Kocaeli Park\u0131", "Eski Toki", "Kirac\u0131lar Toki"], "frequency": "G\xFCnde 34 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 23:00" },
  { "id": "v-live-136", "lineNo": "211", "title": "211 - EREK-\u015EABAN\u0130YE", "route": "K\xFClt\xFCr Saray\u0131- Hayat Hastanesi- Van AVM-Emniyet Caddesi-Erek Meydan\u0131-Sofubaba 1. Sokak- \u015Eabaniye Caddesi-\u015Eabaniye 5. Soka-Kadriye Sa\u011Fd\u0131n\xE7 \u0130.\xD6.O-Eski Edremit 4. Sokak-\xC7ay\xFCst\xFC Sokak- Eski Edremit Yolu- \u015Eabaniye Caddesi- Sebze Hali- Hac\u0131bekir Caddesi- Cumhurriyet Caddesi- Ezberciler \u0130\u015F Merkezi-K\xFClt\xFCr Saray\u0131", "departureTimes": ["06:30 \u015EABAN\u0130YE", "07:00", "08:30", "10:00", "11:30", "14:00", "15:30", "17:15", "19:00"], "returnTimes": [], "stops": ["K\xFClt\xFCr Saray\u0131", "Hayat Hastanesi", "Van AVM", "Emniyet Caddesi", "Erek Meydan\u0131", "Sofubaba 1. Sokak", "\u015Eabaniye Caddesi", "\u015Eabaniye 5. Soka", "Kadriye Sa\u011Fd\u0131n\xE7 \u0130.\xD6.O", "Eski Edremit 4. Sokak", "\xC7ay\xFCst\xFC Sokak", "Eski Edremit Yolu", "\u015Eabaniye Caddesi", "Sebze Hali", "Hac\u0131bekir Caddesi", "Cumhurriyet Caddesi", "Ezberciler \u0130\u015F Merkezi", "K\xFClt\xFCr Saray\u0131"], "frequency": "G\xFCnde 9 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 19:00" },
  { "id": "v-live-140", "lineNo": "221", "title": "221 - KAVURMA MAHALLES\u0130 MEMURSEN TOK\u0130", "route": "K\u0131z Meslek lisesi-S\u0131hke Caddesi- Eski Emniyet Kav\u015Fa\u011F\u0131-\u0130pekyolu Caddesi- Havaalan\u0131 Kav\u015Fa\u011F\u0131-S\xFCmerbank Caddesi- \u0130\u015Fgem-Kavurma Mahallesi-Memursen Toki-S\xFCphan Polis Lojmanlar\u0131", "departureTimes": ["06:30", "07:00", "07:30", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00 HAVAL\u0130MANI", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"], "returnTimes": ["06:30", "07:00", "07:30 ESK\u0130 EMN\u0130YET KAV\u015EA\u011EI", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"], "stops": ["K\u0131z Meslek lisesi", "S\u0131hke Caddesi", "Eski Emniyet Kav\u015Fa\u011F\u0131", "\u0130pekyolu Caddesi", "Havaalan\u0131 Kav\u015Fa\u011F\u0131", "S\xFCmerbank Caddesi", "\u0130\u015Fgem", "Kavurma Mahallesi", "Memursen Toki", "S\xFCphan Polis Lojmanlar\u0131"], "frequency": "G\xFCnde 17 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 21:00" },
  { "id": "v-live-142", "lineNo": "241", "title": "241 - ELMALIK MAHALLES\u0130", "route": "Sevgi Evleri-Elmal\u0131k-Kurto\u011Flu Petrol-B\xF6lge Hastanesi-Eski Emniyet Kav\u015Fa\u011F\u0131-Mara\u015F Cad.-K\xFClt\xFCr Saray\u0131 Zaferler \u0130\xD6O-\xC7ohaz Petrol-Depolama Alan\u0131", "departureTimes": ["07:00", "09:00", "11:00", "13:15", "16:15", "19:15"], "returnTimes": ["08:00", "10:00", "12:00", "15:00", "18:00", "20:15"], "stops": ["Sevgi Evleri", "Elmal\u0131k", "Kurto\u011Flu Petrol", "B\xF6lge Hastanesi", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Mara\u015F Cad.", "K\xFClt\xFCr Saray\u0131 Zaferler \u0130\xD6O", "\xC7ohaz Petrol", "Depolama Alan\u0131"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 19:15" },
  { "id": "v-live-145", "lineNo": "336", "title": "336 - \u0130SKELE YALI-SEL\u0130MBEY MAHALLES\u0130-VAN KALES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi-K\xFClt\xFCr Saray\u0131-Ezberciler \u0130\u015F Merkezi- Mara\u015F Cad.Eski Emniyet Kav\u015Fa\u011F\u0131\u2013Melen Cad- Kale Yolu-Atat\xFCrk K\xFClt\xFCr Park\u0131- Eski Erzurum Yolu Caddesi-Erzurum Yolu 4. Sok-Van Kalesi-\u0130skele Cad-Eski Erzurum Cad-Atat\xFCrk K\xFClt\xFCr Park\u0131-Kale Yolu-Eski Emniyet Kav\u015Fa\u011F\u0131-Mara\u015F Caddesi-Ezberciler-K\xFClt\xFCr Saray\u0131-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 VAN KALES\u0130 / VAN B\xDCY\xDCK\u015EEH\u0130R BELED\u0130YES\u0130I", "08:00 MERKEZ", "09:30 MERKEZ", "11:00 MERKEZ", "13:30 MERKEZ", "15:45 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "K\xFClt\xFCr Saray\u0131", "Ezberciler \u0130\u015F Merkezi", "Mara\u015F Cad.Eski Emniyet Kav\u015Fa\u011F\u0131\u2013Melen Cad", "Kale Yolu", "Atat\xFCrk K\xFClt\xFCr Park\u0131", "Eski Erzurum Yolu Caddesi", "Erzurum Yolu 4. Sok", "Van Kalesi", "\u0130skele Cad", "Eski Erzurum Cad", "Atat\xFCrk K\xFClt\xFCr Park\u0131", "Kale Yolu", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Mara\u015F Caddesi", "Ezberciler", "K\xFClt\xFCr Saray\u0131", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:30" },
  { "id": "v-live-148", "lineNo": "352", "title": "352 - EM\u0130NPA\u015EA MAHALLES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi-\xC7ohaz Petrol-K\xFClt\xFCr Saray\u0131-Ezberciler \u0130\u015F Merkezi-Mara\u015F Caddesi-\u015Ei\u015Fli \xD6\u011Fretmen Evi-Eski Emniyet Kav\u015Fa\u011F\u0131-\u0130pekyolu Caddesi-Terzio\u011Flu Kav\u015Fa\u011F\u0131-\xC7atak Dura\u011F\u0131-Eminpa\u015Fa Mahallesi-Eminpa\u015Fa Caddesi-Mehmetbey Caddesi-Fidanl\u0131k Caddesi-Menek\u015Fe Sokak", "departureTimes": ["06:15 EM\u0130NPA\u015EA MAH B\xD6LGE HASTANES\u0130", "07:15 MERKEZ B\xD6LGE HASTANES\u0130.", "09:30 MERKEZ B\xD6LGE HASTANES\u0130", "11:00 MERKEZ B\xD6LGE HASTANES\u0130", "13:30 MERKEZ", "15:30 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "\xC7ohaz Petrol", "K\xFClt\xFCr Saray\u0131", "Ezberciler \u0130\u015F Merkezi", "Mara\u015F Caddesi", "\u015Ei\u015Fli \xD6\u011Fretmen Evi", "Eski Emniyet Kav\u015Fa\u011F\u0131", "\u0130pekyolu Caddesi", "Terzio\u011Flu Kav\u015Fa\u011F\u0131", "\xC7atak Dura\u011F\u0131", "Eminpa\u015Fa Mahallesi", "Eminpa\u015Fa Caddesi", "Mehmetbey Caddesi", "Fidanl\u0131k Caddesi", "Menek\u015Fe Sokak"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:15 - 17:30" },
  { "id": "v-live-150", "lineNo": "421", "title": "421 - BOSTAN\u0130\xC7\u0130 TOK\u0130", "route": "Milli Egemenlik Caddesi \u0130kizler Kar\u015F\u0131s\u0131-Ferit Melen Bulvar\u0131-Veteriner Caddesi-Huzur Caddesi-Bostani\xE7i Toki Yolu-Bostani\xE7i Toki", "departureTimes": ["06:45", "08:00", "09:00", "10:15", "11:30", "12:45", "14:00", "15:15", "17:00", "18:15", "19:30", "21:00"], "returnTimes": [], "stops": ["Milli Egemenlik Caddesi \u0130kizler Kar\u015F\u0131s\u0131", "Ferit Melen Bulvar\u0131", "Veteriner Caddesi", "Huzur Caddesi", "Bostani\xE7i Toki Yolu", "Bostani\xE7i Toki"], "frequency": "G\xFCnde 12 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:45 - 21:00" },
  { "id": "v-live-151", "lineNo": "422", "title": "422 - YEN\u0130 MAHALLE- ESENLER-G\xDCNDO\u011EDU", "route": "Depolama Alan\u0131\u2013\u015Eerefiye Caddesi-Ordu Caddesi- Milli Egemenlik Caddesi-\u0130kizler Lahmacun-Ferit Melen Bulvar\u0131-Veteriner 2.Sokak-Dilan Sokak-Eczac\u0131lar Birli\u011Fi Ortaokulu-Vadi Sokak-Yal\u0131m Erez Sokak-Okul Caddesi- Kurtulu\u015F Caddesi-Bar\u0131\u015F Caddesi Onur Caddesi-FakiTeyran Camii-U D\xF6n\xFC\u015F\xFC Onur Caddesi-Bar\u0131\u015F Caddesi-Kurtulu\u015F Caddesi-Okul Caddesi-Yal\u0131m Erez Sokak-Vadi Sokak-Eczac\u0131lar Birli\u011Fi Ortaokulu-Dilan Sokak- Veteriner 2. Sokak \u2013 Ferit Melen Bulvar\u0131-\u0130kizler Lahmacun-Depolama Alan\u0131", "departureTimes": ["07:00 ESENLER MAH", "09:00 MERKEZ", "11:00 MERKEZ", "13:45 MERKEZ (ARIZALI)", "15:30 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Depolama Alan\u0131\u2013\u015Eerefiye Caddesi", "Ordu Caddesi", "Milli Egemenlik Caddesi", "\u0130kizler Lahmacun", "Ferit Melen Bulvar\u0131", "Veteriner 2.Sokak", "Dilan Sokak", "Eczac\u0131lar Birli\u011Fi Ortaokulu", "Vadi Sokak", "Yal\u0131m Erez Sokak", "Okul Caddesi", "Kurtulu\u015F Caddesi", "Bar\u0131\u015F Caddesi Onur Caddesi", "FakiTeyran Camii", "U D\xF6n\xFC\u015F\xFC Onur Caddesi", "Bar\u0131\u015F Caddesi", "Kurtulu\u015F Caddesi", "Okul Caddesi", "Yal\u0131m Erez Sokak", "Vadi Sokak", "Eczac\u0131lar Birli\u011Fi Ortaokulu", "Dilan Sokak", "Veteriner 2. Sokak \u2013 Ferit Melen Bulvar\u0131", "\u0130kizler Lahmacun", "Depolama Alan\u0131"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:30" },
  { "id": "v-live-152", "lineNo": "423", "title": "423 - YALIMEREZ MAHALLES\u0130", "route": "Depolama Alan\u0131 - \u015Eerefiye Caddesi -Astsubay Yolu Sokak - Ferit Melen Bulvar\u0131 - K\u0131\u015Fla Yolu - Yal\u0131m Erez Sokak - Erez 8. Sokak \u2013 Ertu\u015F Caddesi - Yal\u0131m Erez 3. Sokak - Erez 7. Sokak - Erez 11. Sokak - Mazi Sokak - \xD6zg\xFCrl\xFCk Caddesi \u2013 Sever Sokak - Kurtulu\u015F Caddesi - S\u0131hke G\xF6l\xFC K\xFCme Evler Sokak - Kurtulu\u015F Caddesi - Sever Sokak \u2013 \xD6zg\xFCrl\xFCk Caddesi - Erez 14. Sokak - Yal\u0131m Erez Sokak - K\u0131\u015Fla Yolu - Ferit Melen Bulvar\u0131 - Astsubay Yolu Sokak - \u015Eerefiye Caddesi - Depolama Alan\u0131.", "departureTimes": ["07:00 MERKEZ.", "08:30 MERKEZ", "11:00 MERKEZ", "13:30 MERKEZ", "15:30 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Depolama Alan\u0131", "\u015Eerefiye Caddesi", "Astsubay Yolu Sokak", "Ferit Melen Bulvar\u0131", "K\u0131\u015Fla Yolu", "Yal\u0131m Erez Sokak", "Erez 8. Sokak \u2013 Ertu\u015F Caddesi", "Yal\u0131m Erez 3. Sokak", "Erez 7. Sokak", "Erez 11. Sokak", "Mazi Sokak", "\xD6zg\xFCrl\xFCk Caddesi \u2013 Sever Sokak", "Kurtulu\u015F Caddesi", "S\u0131hke G\xF6l\xFC K\xFCme Evler Sokak", "Kurtulu\u015F Caddesi", "Sever Sokak \u2013 \xD6zg\xFCrl\xFCk Caddesi", "Erez 14. Sokak", "Yal\u0131m Erez Sokak", "K\u0131\u015Fla Yolu", "Ferit Melen Bulvar\u0131", "Astsubay Yolu Sokak", "\u015Eerefiye Caddesi", "Depolama Alan\u0131."], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:30" },
  { "id": "v-live-153", "lineNo": "425", "title": "425 - KARPUZALAN-DE\u011E\u0130RMENK\xD6Y", "route": "K\xFClt\xFCr Saray\u0131 Kar\u015F\u0131s\u0131-Zaferler \u0130.\xD6.O-Mare\u015Fal Fevzi \xC7akmak Cad.-\u015Eerefiye Cad.-Veteriner Cad.-Bar\u0131\u015F Cad.-Karpuzalan K\xF6y Yolu-Karpuzalan Mahallesi-Kavuncu Mahalle Yolu-De\u011Firmenk\xF6y Mah. Yolu-De\u011Firmenk\xF6y Mahallesi-De\u011Firmenk\xF6y Yolu Karpuzalan Mah.-Karpuzalan K\xF6y Yolu-Bar\u0131\u015F Cad.-\u015Eerefiye Cad. Mare\u015Fal Fevzi \xC7akmak Cad.-K\xFClt\xFCr Saray\u0131 Kar\u015F\u0131s\u0131-Zaferler \u0130.\xD6.O", "departureTimes": ["06:50 MERKEZ", "08:30 MERKEZ", "11:00 MERKEZ", "14:00 MERKEZ", "16:00 MERKEZ", "18:00 MERKEZ"], "returnTimes": ["06:50 MERKEZ", "09:30 MERKEZ", "14:00 MERKEZ", "17:00 MERKEZ"], "stops": ["K\xFClt\xFCr Saray\u0131 Kar\u015F\u0131s\u0131", "Zaferler \u0130.\xD6.O", "Mare\u015Fal Fevzi \xC7akmak Cad.", "\u015Eerefiye Cad.", "Veteriner Cad.", "Bar\u0131\u015F Cad.", "Karpuzalan K\xF6y Yolu", "Karpuzalan Mahallesi", "Kavuncu Mahalle Yolu", "De\u011Firmenk\xF6y Mah. Yolu", "De\u011Firmenk\xF6y Mahallesi", "De\u011Firmenk\xF6y Yolu Karpuzalan Mah.", "Karpuzalan K\xF6y Yolu", "Bar\u0131\u015F Cad.", "\u015Eerefiye Cad. Mare\u015Fal Fevzi \xC7akmak Cad.", "K\xFClt\xFCr Saray\u0131 Kar\u015F\u0131s\u0131", "Zaferler \u0130.\xD6.O"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:50 - 18:00" },
  { "id": "v-live-154", "lineNo": "426", "title": "426 - KIRATLI MAHALLES\u0130", "route": "Ferit Melen Bulvar\u0131.-Be\u015Fyol-K\u0131\u015Fla Yolu-Yal\u0131m Erez Sokak- Demokrasi Caddesi-Kurtulu\u015F Caddesi-Siyahta\u015F Sokak-K\u0131ratl\u0131 Mahalle Yolu-K\u0131ratl\u0131 Mahallesi-K\u0131ratl\u0131 Mahalle Yolu-Siyahta\u015F Sokak-Kurtulu\u015F Caddesi-Demokrasi Caddesi-Yal\u0131m Erez Sokak-K\u0131\u015Fla Yolu-Be\u015Fyol- Ferit Melen Bulvar\u0131-Depolama Alan\u0131", "departureTimes": ["06:40 MERKEZ", "07:00 KIRATLI", "09:00 MERKEZ", "11:00 MERKEZ", "12:15 MERKEZ", "14:00 MERKEZ", "16:00 MERKEZ", "17:30 MERKEZ"], "returnTimes": ["06:40", "07:00", "09:30", "15:00", "17:00"], "stops": ["Ferit Melen Bulvar\u0131.", "Be\u015Fyol", "K\u0131\u015Fla Yolu", "Yal\u0131m Erez Sokak", "Demokrasi Caddesi", "Kurtulu\u015F Caddesi", "Siyahta\u015F Sokak", "K\u0131ratl\u0131 Mahalle Yolu", "K\u0131ratl\u0131 Mahallesi", "K\u0131ratl\u0131 Mahalle Yolu", "Siyahta\u015F Sokak", "Kurtulu\u015F Caddesi", "Demokrasi Caddesi", "Yal\u0131m Erez Sokak", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "Ferit Melen Bulvar\u0131", "Depolama Alan\u0131"], "frequency": "G\xFCnde 8 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:40 - 17:30" },
  { "id": "v-live-155", "lineNo": "427", "title": "427 - ORTANCA-K\xD6\u015EEBA\u015E-G\xD6VELEK MAHALLES\u0130", "route": "\u0130kizler-Milli Egemenlik Cad.-\u015Eerefiya Cad.- Bar\u0131\u015F Cad.-Karpuzalan-K\xF6\u015Feba\u015F-G\xF6velek-Ortanca-", "departureTimes": ["07:15 ORTANCA (ARIZALI)", "16:00 MERKEZ (ARIZALI)"], "returnTimes": [], "stops": ["\u0130kizler", "Milli Egemenlik Cad.", "\u015Eerefiya Cad.", "Bar\u0131\u015F Cad.", "Karpuzalan", "K\xF6\u015Feba\u015F", "G\xF6velek", "Ortanca"], "frequency": "G\xFCnde 2 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:15 - 16:00" },
  { "id": "v-live-156", "lineNo": "428", "title": "428 - KAR\u015EIYAKA MAHALLES\u0130", "route": "Depolama Alan\u0131-\u0130kizler Dura\u011F\u0131-Mare\u015Fal Fevzi \xC7akmak Cad-\u015Eerefiye Cad- Garipler Sokak-Erekda\u011F\u0131 Caddesi-Do\u011Fu Caddesi-Menek\u015Fe Sokak-Ba\u011Flarba\u015F\u0131 Sokak-R\xFCzgar Sokak- S\xF6nmez Sokak-Selima\u011Fa Sokak-Ba\u011Flarba\u015F\u0131 Sokak-Menek\u015Fe Sokak-Do\u011Fu Caddesi-Erek Da\u011F\u0131 Caddesi-Garipler Sokak-\u015Eerefiye Caddesi-Mare\u015Fal Fevzi \xC7akmak Cad-\u0130kizler Dura\u011F\u0131-Milli Egemenlik Cad.-Depolama Alan\u0131-", "departureTimes": ["06:45 KAR\u015EIYAKA", "07:20 \u0130K\u0130ZLER", "08:30 \u0130K\u0130ZLER.", "09:30 \u0130K\u0130ZLER", "11:00 \u0130K\u0130ZLER", "13:00 \u0130K\u0130ZLER", "14:30 \u0130K\u0130ZLER", "16:00 \u0130K\u0130ZLER", "17:30 \u0130K\u0130ZLER"], "returnTimes": [], "stops": ["Depolama Alan\u0131", "\u0130kizler Dura\u011F\u0131", "Mare\u015Fal Fevzi \xC7akmak Cad", "\u015Eerefiye Cad", "Garipler Sokak", "Erekda\u011F\u0131 Caddesi", "Do\u011Fu Caddesi", "Menek\u015Fe Sokak", "Ba\u011Flarba\u015F\u0131 Sokak", "R\xFCzgar Sokak", "S\xF6nmez Sokak", "Selima\u011Fa Sokak", "Ba\u011Flarba\u015F\u0131 Sokak", "Menek\u015Fe Sokak", "Do\u011Fu Caddesi", "Erek Da\u011F\u0131 Caddesi", "Garipler Sokak", "\u015Eerefiye Caddesi", "Mare\u015Fal Fevzi \xC7akmak Cad", "\u0130kizler Dura\u011F\u0131", "Milli Egemenlik Cad.", "Depolama Alan\u0131"], "frequency": "G\xFCnde 9 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:45 - 17:30" },
  { "id": "v-live-157", "lineNo": "431", "title": "431 - KEVENL\u0130 TOK\u0130", "route": "K\xFClt\xFCr Saray\u0131-Milli Egemenlik Caddesi-Hayat Hastanesi-Erek Da\u011F\u0131 Caddesi-VBB-Kar\u015F\u0131yaka Be\u015Fyol-Rahman Yolu Caddesi-Kevenli TOK\u0130", "departureTimes": ["07:00", "07:50", "09:00", "10:00", "11:00", "13:00", "14:15", "16:00", "17:30", "19:00", "20:30"], "returnTimes": ["06:30 HAFTA \u0130\xC7\u0130", "07:20", "08:20", "09:20", "10:20", "11:20", "13:30", "14:45", "16:45", "18:15", "19:45"], "stops": ["K\xFClt\xFCr Saray\u0131", "Milli Egemenlik Caddesi", "Hayat Hastanesi", "Erek Da\u011F\u0131 Caddesi", "VBB", "Kar\u015F\u0131yaka Be\u015Fyol", "Rahman Yolu Caddesi", "Kevenli TOK\u0130"], "frequency": "G\xFCnde 11 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 20:30" },
  { "id": "v-live-160", "lineNo": "442", "title": "442 - KURUBA\u015E MAHALLES\u0130", "route": "K\xFClt\xFCr Saray\u0131 -Milli Egemenlik Caddesi-Hayat Hastanesi-Hac\u0131bekir Caddesi-Sebze Hali Kav\u015Fa\u011F\u0131-Hakkari Yolu-Tekstil Kent-Kuruba\u015F K\xF6y\xFC Yolu-Kuruba\u015F-Kuruba\u015F K\xF6y\xFC Yolu-Hakkari Yolu-Veysel Karani Sokak-Do\u011Fu Caddesi- Sebze Hali Kav\u015Fa\u011F\u0131-Hac\u0131bekir Caddesi-Cumhuriyet Caddesi-Ezberciler-K\xFClt\xFCr Saray\u0131", "departureTimes": ["06:50 MERKEZ", "08:30 MERKEZ", "10:00 MERKEZ", "11:30 MERKEZ", "14:00 MERKEZ", "15:30 MERKEZ", "17:30 MERKEZ"], "returnTimes": ["07:00", "08:30", "10:00", "14:30", "16:00", "17:00"], "stops": ["K\xFClt\xFCr Saray\u0131", "Milli Egemenlik Caddesi", "Hayat Hastanesi", "Hac\u0131bekir Caddesi", "Sebze Hali Kav\u015Fa\u011F\u0131", "Hakkari Yolu", "Tekstil Kent", "Kuruba\u015F K\xF6y\xFC Yolu", "Kuruba\u015F", "Kuruba\u015F K\xF6y\xFC Yolu", "Hakkari Yolu", "Veysel Karani Sokak", "Do\u011Fu Caddesi", "Sebze Hali Kav\u015Fa\u011F\u0131", "Hac\u0131bekir Caddesi", "Cumhuriyet Caddesi", "Ezberciler", "K\xFClt\xFCr Saray\u0131"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:50 - 17:30" },
  { "id": "v-live-161", "lineNo": "521", "title": "521 - ALTINTEPE MAHALLES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi -\xC7ohaz Petrol-Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-Emniyet Kav\u015Fa\u011F\u0131-\u0130skele Caddesi-\xC7al\u0131 Dura\u011F\u0131-Bedi\xFCzzaman Caddesi-G\xFClendan Sokak-G\xFClendan 3. Sokak-Erci\u015F Yolu 1.Sokak-G\xFClendan 4.Sokak-Ethemdede Sokak-Abdurrahman Gazi Sokak-R\xFCzgar Sokak-Zeve Caddesi-Alt\u0131ntepe 1.Sokak-Tren Yolu Sokak-\u015Eemsibey 5.Sokak-Veysel Karani Sokak-Kalecik Yolu Sokak-S\u0131r Sokak-Can Sokak-Alt\u0131ntepe 3.Sokak-Zeve Caddesi-\u0130skele Caddesi-Yeniyol Kav\u015Fa\u011F\u0131-Be\u015Fyol-\u0130kizler-Ters Ev-\xC7ohaz Petrol-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 ALTINTEPE", "08:00 MERKEZ", "09:30 MERKEZ", "11:00 MERKEZ", "13:30 MERKEZ", "15:30 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "\xC7ohaz Petrol", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "Emniyet Kav\u015Fa\u011F\u0131", "\u0130skele Caddesi", "\xC7al\u0131 Dura\u011F\u0131", "Bedi\xFCzzaman Caddesi", "G\xFClendan Sokak", "G\xFClendan 3. Sokak", "Erci\u015F Yolu 1.Sokak", "G\xFClendan 4.Sokak", "Ethemdede Sokak", "Abdurrahman Gazi Sokak", "R\xFCzgar Sokak", "Zeve Caddesi", "Alt\u0131ntepe 1.Sokak", "Tren Yolu Sokak", "\u015Eemsibey 5.Sokak", "Veysel Karani Sokak", "Kalecik Yolu Sokak", "S\u0131r Sokak", "Can Sokak", "Alt\u0131ntepe 3.Sokak", "Zeve Caddesi", "\u0130skele Caddesi", "Yeniyol Kav\u015Fa\u011F\u0131", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "\xC7ohaz Petrol", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:30" },
  { "id": "v-live-162", "lineNo": "540", "title": "540 - \u0130K\u0130N\u0130SAN CADDES\u0130 - Y\xDCZ\xDCNC\xDC YIL \xDCN\u0130VERS\u0130TES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi-\xC7ohaz Petrol-K\xFClt\xFCr Saray\u0131-Hayat Hastanesi-Van AVM Kav\u015Fa\u011F\u0131-\u0130kinisan Caddesi-Terzio\u011Flu Kav\u015Fa\u011F\u0131-\u0130pekyolu Caddesi-Eski Emniyet Kav\u015Fa\u011F\u0131-Otogar Kav\u015Fa\u011F\u0131-Sanayi Sitesi-YY\xDC Ara\u015Ft\u0131rma Hastanesi-Kamp\xFCs", "departureTimes": ["06:50", "08:00 EK ARA\xC7", "09:15", "10:30 EK ARA\xC7", "11:45", "13:00 EK ARA\xC7", "14:30 ARIZALI", "16:00 EK ARA\xC7", "17:30"], "returnTimes": ["06:50 EK ARA\xC7", "08:00", "09:15 EK ARA\xC7", "10:30", "11:45 EK ARA\xC7", "13:00 ARIZALI", "14:30 EK ARA\xC7", "16:00", "17:30 EK ARA\xC7"], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "\xC7ohaz Petrol", "K\xFClt\xFCr Saray\u0131", "Hayat Hastanesi", "Van AVM Kav\u015Fa\u011F\u0131", "\u0130kinisan Caddesi", "Terzio\u011Flu Kav\u015Fa\u011F\u0131", "\u0130pekyolu Caddesi", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Otogar Kav\u015Fa\u011F\u0131", "Sanayi Sitesi", "YY\xDC Ara\u015Ft\u0131rma Hastanesi", "Kamp\xFCs"], "frequency": "G\xFCnde 9 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:50 - 17:30" },
  { "id": "v-live-163", "lineNo": "541", "title": "541 - BE\u015EYOL KAMP\xDCS Y\xDCZ\xDCNC\xDC YIL \xDCN\u0130VERS\u0130TES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol -\u0130skele Caddesi-Karayollar\u0131 Kav.-Otogar-Erci\u015F Yolu-Sanayii-YY\xDC Ara\u015Ft\u0131rma Hastanesi-Kamp\xFCs", "departureTimes": ["06:45", "07:45", "09:00", "10:15", "11:30", "12:45", "14:00", "15:15", "16:30"], "returnTimes": ["06:45", "07:45", "09:00", "10:15", "11:30", "12:45", "14:00", "15:15", "16:30", "17:45"], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "\u0130skele Caddesi", "Karayollar\u0131 Kav.", "Otogar", "Erci\u015F Yolu", "Sanayii", "YY\xDC Ara\u015Ft\u0131rma Hastanesi", "Kamp\xFCs"], "frequency": "G\xFCnde 9 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:45 - 16:30" },
  { "id": "v-live-164", "lineNo": "542", "title": "542 - MARA\u015E CADDES\u0130 - Y\xDCZ\xDCNC\xDC YIL \xDCN\u0130VERS\u0130TES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi-\xC7ohaz Petrol-Zaferler \u0130.\xD6.O- K\xFClt\xFCr Saray\u0131- Mara\u015F Caddesi-Eski Emniyet Kav\u015Fa\u011F\u0131-Otogar Kav\u015Fa\u011F\u0131-Oto Sanayi Sitesi Kav\u015Fa\u011F\u0131-Y.Y.\xDC Ara\u015Ft\u0131rma Hastanesi-Kamp\xFCs", "departureTimes": ["07:00", "07:30 EK ARA\xC7", "08:00", "08:30 EK ARA\xC7", "09:30", "10:00 EK ARA\xC7", "11:00", "11:30 EK ARA\xC7", "12:30", "13:00 EK ARA\xC7", "14:00", "14:30 EK ARA\xC7", "15:30", "16:00 EK ARA\xC7", "17:00", "17:30 EK ARA\xC7", "18:30", "20:00", "21:00", "22:00"], "returnTimes": ["07:00", "07:30 EK ARA\xC7", "08:00", "08:30 EK ARA\xC7", "09:30", "10:00 EK ARA\xC7", "11:00", "11:30 EK ARA\xC7", "12:30", "13:00 EK ARA\xC7", "14:00", "14:30 EK ARA\xC7", "15:30", "16:00 EK ARA\xC7", "16:45", "17:15 EK ARA\xC7", "18:30", "20:00", "21:00", "22:00"], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "\xC7ohaz Petrol", "Zaferler \u0130.\xD6.O", "K\xFClt\xFCr Saray\u0131", "Mara\u015F Caddesi", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Otogar Kav\u015Fa\u011F\u0131", "Oto Sanayi Sitesi Kav\u015Fa\u011F\u0131", "Y.Y.\xDC Ara\u015Ft\u0131rma Hastanesi", "Kamp\xFCs"], "frequency": "G\xFCnde 20 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 22:00" },
  { "id": "v-live-165", "lineNo": "543", "title": "543 - \u0130SKELE MAHALLES\u0130-Y\xDCZ\xDCNC\xDC YIL \xDCN\u0130VERS\u0130TES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol Halk E\u011Fitim Merkezi-\u0130skele Caddesi- Karayollar\u0131 Kav\u015Fa\u011F\u0131- \u0130skele Caddesi-\u0130skele-\u015Eemsibey Caddesi-Erci\u015F Yolu-YY\xDC Ara\u015Ft\u0131rma Hastanesi-Kamp\xFCs", "departureTimes": ["07:00", "08:00 EK ARA\xC7", "09:30", "11:00 EK ARA\xC7", "12:15", "13:30 EK ARA\xC7", "15:00", "16:00 EK ARA\xC7", "18:30 EK ARA\xC7"], "returnTimes": ["07:00 EK ARA\xC7", "08:15", "09:30 EK ARA\xC7", "11:00", "12:15 EK ARA\xC7", "13:30", "14:45 EK ARA\xC7", "16:30", "17:15 EK ARA\xC7"], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol Halk E\u011Fitim Merkezi", "\u0130skele Caddesi", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "\u0130skele Caddesi", "\u0130skele", "\u015Eemsibey Caddesi", "Erci\u015F Yolu", "YY\xDC Ara\u015Ft\u0131rma Hastanesi", "Kamp\xFCs"], "frequency": "G\xFCnde 9 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 18:30" },
  { "id": "v-live-166", "lineNo": "611", "title": "611 - KALEC\u0130K TOK\u0130", "route": "Otob\xFCs Hareket Amiri-Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-\u0130skele Caddesi-Yeni Emniyet Kav\u015Fa\u011F\u0131-Otogar Kav\u015Fa\u011F\u0131-Oto Sanayi Sitesi Kav\u015Fa\u011F\u0131-Oto A\xE7\u0131k Pazar\u0131-Kalecik Toki-Ko\xE7 \xD6\u011Fretmen Lojmanlar\u0131", "departureTimes": ["06:30", "07:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "07:30", "07:45 EK ARA\xC7", "08:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "09:00", "09:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "10:00 EK ARA\xC7", "10:30", "11:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "12:00", "12:30 KO\xC7 \xD6\u011ERETMEN LOJMANLAR", "13:30", "14:00 KO\xC7 \xD6\u011ERETMEN LOJMANLAR", "14:30 EK ARA\xC7", "15:00", "15:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "16:30", "17:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "17:30 EK ARA\xC7", "18:00", "18:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "19:30", "20:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "21:00", "21:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "22:00"], "returnTimes": ["06:30", "06:50 EK ARA\xC7", "07:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "07:30", "08:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "08:40 EK ARA\xC7", "09:00", "09:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "10:30", "11:00 KO\xC7 \xD6\u011ERETMEN LOJMANLAR", "11:30 EK ARA\xC7", "12:00", "12:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "13:30", "14:00 KO\xC7 \xD6\u011ERETMEN LOJMANLAR", "15:00", "15:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "16:00 EK ARA\xC7", "16:30", "17:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "18:00", "18:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "19:00 (EK ARA\xC7)", "19:30", "20:00 KO\xC7 \xD6\u011ERETMEN LOJMANLARI", "21:00", "21:30 KO\xC7 \xD6\u011ERETMEN LOJMANLARI"], "stops": ["Otob\xFCs Hareket Amiri", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "\u0130skele Caddesi", "Yeni Emniyet Kav\u015Fa\u011F\u0131", "Otogar Kav\u015Fa\u011F\u0131", "Oto Sanayi Sitesi Kav\u015Fa\u011F\u0131", "Oto A\xE7\u0131k Pazar\u0131", "Kalecik Toki", "Ko\xE7 \xD6\u011Fretmen Lojmanlar\u0131"], "frequency": "G\xFCnde 27 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 22:00" },
  { "id": "v-live-167", "lineNo": "631", "title": "631 - \u015EEMS\u0130BEY MAHALLES\u0130", "route": "Depolama Alan\u0131-Astsubay Yolu Caddesi-Be\u015Fyol- \u0130skele Caddesi-Karayollar\u0131 Kav\u015Fa\u011F\u0131-Otogar Kav.- Erci\u015F Yolu-\u015Eemsibey Mahallesi-\u015Eemsibey Mahallesi-Erci\u015F Yolu- Otogar- Karayollar\u0131 Kav\u015Fa\u011F\u0131-S\u0131hke Caddesi-Be\u015Fyol-Astsubay yolu Caddesi-Depolama Alan\u0131", "departureTimes": ["06:40 \u015EEMS\u0130BEY", "07:15 MERKEZ", "09:15 MERKEZ", "11:00 MERKEZ.", "13:00 MERKEZ", "15:00 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Depolama Alan\u0131", "Astsubay Yolu Caddesi", "Be\u015Fyol", "\u0130skele Caddesi", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "Otogar Kav.", "Erci\u015F Yolu", "\u015Eemsibey Mahallesi", "\u015Eemsibey Mahallesi", "Erci\u015F Yolu", "Otogar", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "S\u0131hke Caddesi", "Be\u015Fyol", "Astsubay yolu Caddesi", "Depolama Alan\u0131"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:40 - 17:30" },
  { "id": "v-live-168", "lineNo": "632", "title": "632 - YE\u015E\u0130LK\xD6Y-TOPAKTA\u015E-YURTLU-MAHALLES\u0130", "route": "Akk\xF6pr\xFC Deresi-H\u0131d\u0131rellez Caddesi-Otogar Kav.- Erci\u015F Yolu-AMATEM-Ye\u015Filk\xF6y-Topakta\u015F-Yurtlu Mah.-Dursun Odaba\u015F T\u0131p Merkezi-Erci\u015F Yolu- Sanayii Sitesi- Otogar-Emniyet Kav\u015Fa\u011F\u0131-S\u0131hke Caddesi-Be\u015Fyol", "departureTimes": ["06:45 YE\u015E\u0130LK\xD6Y", "08:30 MERKEZ", "10:30 MERKEZ", "14:00 MERKEZ", "16:00 MERKEZ", "18:00 MERKEZ"], "returnTimes": ["06:45 YE\u015E\u0130LK\xD6Y", "09:30 MERKEZ", "14:30 MERKEZ", "18:00 MERKEZ"], "stops": ["Akk\xF6pr\xFC Deresi", "H\u0131d\u0131rellez Caddesi", "Otogar Kav.", "Erci\u015F Yolu", "AMATEM", "Ye\u015Filk\xF6y", "Topakta\u015F", "Yurtlu Mah.", "Dursun Odaba\u015F T\u0131p Merkezi", "Erci\u015F Yolu", "Sanayii Sitesi", "Otogar", "Emniyet Kav\u015Fa\u011F\u0131", "S\u0131hke Caddesi", "Be\u015Fyol"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:45 - 18:00" },
  { "id": "v-live-169", "lineNo": "635", "title": "635 - ORGAN\u0130ZE SANAY\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-S\u0131hke Caddesi-Eski Emniyet Kav\u015Fa\u011F\u0131-Otogar Kav\u015Fa\u011F\u0131-Oto Sanayi Kav\u015Fa\u011F\u0131-Organize Sanayi-Organize Sanayi-Oto Sanayi Kav\u015Fa\u011F\u0131-Otogar Kav\u015Fa\u011F\u0131-Eski Emniyet Kav\u015Fa\u011F\u0131-S\u0131hke Caddesi-Be\u015Fyol-\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["06:30 MERKEZ ESK\u0130 G\xDCZERGAHI KULANACAK", "08:15 MERKEZ", "10:30 MERKEZ.", "12:30 MERKEZ", "15:00 MERKEZ", "17:00 MERKEZ"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "S\u0131hke Caddesi", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Otogar Kav\u015Fa\u011F\u0131", "Oto Sanayi Kav\u015Fa\u011F\u0131", "Organize Sanayi", "Organize Sanayi", "Oto Sanayi Kav\u015Fa\u011F\u0131", "Otogar Kav\u015Fa\u011F\u0131", "Eski Emniyet Kav\u015Fa\u011F\u0131", "S\u0131hke Caddesi", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 17:00" },
  { "id": "v-live-170", "lineNo": "641", "title": "641 - F-T\u0130P\u0130 CEZAEV\u0130 (YY\xDC TOK\u0130)", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol Halk E\u011Fitim Merkezi-\u0130skele Caddesi-Otogar-Sanayi Sitesi-Erci\u015F Yolu-YY\xDC Ara\u015Ft\u0131rma Hastanesi- Bardak\xE7\u0131 TOK\u0130-AMATEM-Van Tar\u0131m Meslek Lisesi- F Tipi Cezaevi", "departureTimes": ["06:50", "07:00 EK ARA\xC7", "08:30", "09:30 EK ARA\xC7", "10:00", "11:30", "13:00", "13:30 EK ARA\xC7", "14:30", "16:00", "16:45 EK ARA\xC7 YEN\u0130K\xD6\u015EK K\xD6Y\xDC", "17:30 YEN\u0130K\xD6\u015EK K\xD6Y\xDC (CUMARTES\u0130)", "19:00", "20:00 EK ARA\xC7"], "returnTimes": ["06:50 YEN\u0130K\xD6\u015EK K\xD6Y\xDC (CUMARTES\u0130)", "08:00 EK ARA\xC7", "08:30", "10:00", "11:00 EK ARA\xC7", "11:30", "13:00", "14:30", "15:10 EK ARA\xC7", "16:00", "17:15", "19:00"], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol Halk E\u011Fitim Merkezi", "\u0130skele Caddesi", "Otogar", "Sanayi Sitesi", "Erci\u015F Yolu", "YY\xDC Ara\u015Ft\u0131rma Hastanesi", "Bardak\xE7\u0131 TOK\u0130", "AMATEM", "Van Tar\u0131m Meslek Lisesi", "F Tipi Cezaevi"], "frequency": "G\xFCnde 14 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:50 - 20:00" },
  { "id": "v-live-172", "lineNo": "645", "title": "645 - KASIMO\u011ELU-D\u0130L\u0130ML\u0130-SATIBEY-KO\xC7K\xD6Y-ADIG\xDCZEL", "route": "Otluca-K\xF6pr\xFCk\xF6y-Yumrutepe-Erci\u015F yolu-AMATEM-Otogar-Karayollar\u0131 Kav\u015Fa\u011F\u0131-Eski Emniyet Kav\u015Fa\u011F\u0131-S\u0131hke Cad.-Be\u015Fyol-\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["06:00 MAK\u0130NE \u0130KMAL GARAJI", "07:00 ADIG\xDCZEL"], "returnTimes": [], "stops": ["Otluca", "K\xF6pr\xFCk\xF6y", "Yumrutepe", "Erci\u015F yolu", "AMATEM", "Otogar", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "Eski Emniyet Kav\u015Fa\u011F\u0131", "S\u0131hke Cad.", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 2 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:00 - 07:00" },
  { "id": "v-live-173", "lineNo": "651", "title": "651 - ATMACA-ALAK\xD6Y-AYANIS-MOLLAKASIM", "route": "Akk\xF6pr\xFC Deresi-H\u0131d\u0131rellez Cad.-Otogar -Eci\u015F yolu-AMATEM--F Tipi Cezaevi-Atmaca-Alak\xF6y-Ayan\u0131s-Mavi Bayrakl\u0131 Plaj-Mollakas\u0131m Mahallesi-Alak\xF6y Mah.-F Tipi Ceza Evi-AMATEM-Erci\u015F Yolu- Otogar Kav\u015Fa\u011F\u0131-Karayollar\u0131 Kav\u015Fa\u011F\u0131-Eski Emn.Kav.-S\u0131hke Cad-Be\u015Fyol", "departureTimes": ["05:50 ARACIMIZ MAK\u0130NE \u0130KMAL GARAJINDAN \xC7IKI\u015E YAPACAKTIR", "09:00 MERKEZ", "14:00 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Akk\xF6pr\xFC Deresi", "H\u0131d\u0131rellez Cad.", "Otogar", "Eci\u015F yolu", "AMATEM", "F Tipi Cezaevi", "Atmaca", "Alak\xF6y", "Ayan\u0131s", "Mavi Bayrakl\u0131 Plaj", "Mollakas\u0131m Mahallesi", "Alak\xF6y Mah.", "F Tipi Ceza Evi", "AMATEM", "Erci\u015F Yolu", "Otogar Kav\u015Fa\u011F\u0131", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "Eski Emn.Kav.", "S\u0131hke Cad", "Be\u015Fyol"], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "05:50 - 17:30" },
  { "id": "v-live-174", "lineNo": "652", "title": "652 - D\u0130BEKD\xDCZ\xDC-ARISU-\xC7\u0130T\xD6REN-ESK\u0130 TOPAKTA\u015E-BARDAK\xC7I MAHALLES\u0130", "route": "Akk\xF6pr\xFC Deresi-H\u0131drellez Cad.-Erci\u015F Yolu -Otogar-YY\xDC Dursun Odaba\u015F -Eski Topakta\u015F Mah-Ar\u0131su Mah-Dibekd\xFCz\xFC Mah.Ar\u0131su Mah.-Topakta\u015F Mah.-Bardak\xE7\u0131 Mah.-YY\xDC Dursun Odaba\u015F- Erci\u015F Yolu - Otogar Kav\u015Fa\u011F\u0131-Karayollar\u0131 Kav\u015Fa\u011F\u0131-Eski Emn.Kav.-S\u0131hke Cad-Be\u015Fyol", "departureTimes": ["07:00 \xC7\u0130T\xD6REN", "09:00 MERKEZ", "14:30 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Akk\xF6pr\xFC Deresi", "H\u0131drellez Cad.", "Erci\u015F Yolu", "Otogar", "YY\xDC Dursun Odaba\u015F", "Eski Topakta\u015F Mah", "Ar\u0131su Mah", "Dibekd\xFCz\xFC Mah.Ar\u0131su Mah.", "Topakta\u015F Mah.", "Bardak\xE7\u0131 Mah.", "YY\xDC Dursun Odaba\u015F", "Erci\u015F Yolu", "Otogar Kav\u015Fa\u011F\u0131", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "Eski Emn.Kav.", "S\u0131hke Cad", "Be\u015Fyol"], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:30" },
  { "id": "v-live-175", "lineNo": "655", "title": "655 - G\xD6LL\xDC-G\xDCVE\xC7L\u0130-YE\u015E\u0130LSU-DA\u011E\xD6N\xDC-\xD6ZYURT", "route": "Depolama Alan\u0131-Astsubay yolu Caddesi-Be\u015Fyol-\u0130skele Cad.-Karayollar\u0131 Kav.-Erci\u015F Yolu-AMATEM-F Tipi Cezaevi-G\xF6ll\xFC-G\xFCve\xE7li-Ye\u015Filsu-Da\u011F\xF6n\xFC Mah.-\xD6zyurt Mah.Ye\u015Filsu-G\xFCve\xE7li-G\xF6ll\xFC-F Tipi Ceza Evi-AMATEM-Erci\u015F Yolu- Otogar Kav\u015Fa\u011F\u0131-Karayollar\u0131 Kav\u015Fa\u011F\u0131-S\u0131hke Cad.- Be\u015Fyol-Astsubay Yolu Caddesi-Depolama Alan\u0131", "departureTimes": ["07:05 \xD6ZYURT", "09:00 MERKEZ (ARA\xC7 \xD6ZYURTA ARIZALANDI D\xD6N\xDC\u015E\xDC \u0130PTAL)", "13:30 MERKEZ", "17:00 MERKEZ"], "returnTimes": [], "stops": ["Depolama Alan\u0131", "Astsubay yolu Caddesi", "Be\u015Fyol", "\u0130skele Cad.", "Karayollar\u0131 Kav.", "Erci\u015F Yolu", "AMATEM", "F Tipi Cezaevi", "G\xF6ll\xFC", "G\xFCve\xE7li", "Ye\u015Filsu", "Da\u011F\xF6n\xFC Mah.", "\xD6zyurt Mah.Ye\u015Filsu", "G\xFCve\xE7li", "G\xF6ll\xFC", "F Tipi Ceza Evi", "AMATEM", "Erci\u015F Yolu", "Otogar Kav\u015Fa\u011F\u0131", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "S\u0131hke Cad.", "Be\u015Fyol", "Astsubay Yolu Caddesi", "Depolama Alan\u0131"], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:05 - 17:00" },
  { "id": "v-live-176", "lineNo": "710", "title": "710 - \u0130STASYON MAHALLES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol Kav\u015Fa\u011F\u0131 - \u0130skele Caddesi-Karayollar\u0131 Kav\u015Fa\u011F\u0131-\u0130pekyolu Caddesi-Otogar Kav\u015Fa\u011F\u0131 -Terminal Caddesi-\u0130stasyon Caddesi -Seyrantepe Mezarl\u0131\u011F\u0131-\u015Eair \u0130zi Sokak - Seyhan Sokak-U D\xF6n\xFC\u015F\xFC-Seyhan Sokak -\u015Eair \u0130zi Sokak -\u0130stasyon Caddesi -Terminal Caddesi-Otogar Kav\u015Fa\u011F\u0131 -\u0130pekyolu Caddesi-Karayollar\u0131 Kav\u015Fa\u011F\u0131 \u2013Eski Emniyet Kav\u015Fa\u011F\u0131 S\u0131hke Caddesi Be\u015Fyol -\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 \u0130STASYON", "08:00 MERKEZ", "09:30 MERKEZ", "11:00 MERKEZ", "13:15 MERKEZ", "15:30 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol Kav\u015Fa\u011F\u0131", "\u0130skele Caddesi", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "\u0130pekyolu Caddesi", "Otogar Kav\u015Fa\u011F\u0131", "Terminal Caddesi", "\u0130stasyon Caddesi", "Seyrantepe Mezarl\u0131\u011F\u0131", "\u015Eair \u0130zi Sokak", "Seyhan Sokak", "U D\xF6n\xFC\u015F\xFC", "Seyhan Sokak", "\u015Eair \u0130zi Sokak", "\u0130stasyon Caddesi", "Terminal Caddesi", "Otogar Kav\u015Fa\u011F\u0131", "\u0130pekyolu Caddesi", "Karayollar\u0131 Kav\u015Fa\u011F\u0131 \u2013Eski Emniyet Kav\u015Fa\u011F\u0131 S\u0131hke Caddesi Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:30" },
  { "id": "v-live-177", "lineNo": "721", "title": "721 - SEYRANTEPE MAHALLES\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol Halk E\u011Fitim Merkezi-\u0130skele Cad.-\u0130pekyolu Bulvar\u0131-Otogar-\xD6zalp Yolu-Bey\xFCz\xFCm\xFC Cad.-Averek Yolu-Averek 10.Sok.-D\xFCzyol 1.Sok.D\xFCzyol 12. Sok.-D\xFCzyol Cad.-Marangozcular Sitesi-Tren Yolu Sok.-D\xFCzyol 4. Sokak-Bey\xFCz\xFCm\xFC Caddesi-Otogar -Karayollar\u0131 Kav.-Eski Emniyet Kav.-S\u0131hke Cad.-Be\u015Fyol-\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["06:50 ALABAYIR", "07:00 SEYRANTEPE", "08:00 MERKEZ.", "09:30 MERKEZ", "11:00 MERKEZ", "13:30 MERKEZ", "17:30 MERKEZ (ALABAYIR)"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol Halk E\u011Fitim Merkezi", "\u0130skele Cad.", "\u0130pekyolu Bulvar\u0131", "Otogar", "\xD6zalp Yolu", "Bey\xFCz\xFCm\xFC Cad.", "Averek Yolu", "Averek 10.Sok.", "D\xFCzyol 1.Sok.D\xFCzyol 12. Sok.", "D\xFCzyol Cad.", "Marangozcular Sitesi", "Tren Yolu Sok.", "D\xFCzyol 4. Sokak", "Bey\xFCz\xFCm\xFC Caddesi", "Otogar", "Karayollar\u0131 Kav.", "Eski Emniyet Kav.", "S\u0131hke Cad.", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:50 - 17:30" },
  { "id": "v-live-178", "lineNo": "741", "title": "741 - SIHKE TOK\u0130", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol Halk E\u011Fitim Merkezi-Ko\xE7ibey Caddesi-\u0130pekyolu Bulvar\u0131-Otogar-\xD6zalp Yolu-K\xF6m\xFCrc\xFCler Sitesi- S\u0131hke TOK\u0130", "departureTimes": ["06:30 SIHKE TOK\u0130", "07:00", "09:00", "11:00", "13:00", "15:00", "17:15", "19:00", "21:00"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol Halk E\u011Fitim Merkezi", "Ko\xE7ibey Caddesi", "\u0130pekyolu Bulvar\u0131", "Otogar", "\xD6zalp Yolu", "K\xF6m\xFCrc\xFCler Sitesi", "S\u0131hke TOK\u0130"], "frequency": "G\xFCnde 9 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 21:00" },
  { "id": "v-live-179", "lineNo": "115", "title": "115 - AKDAMAR ADASI-BALABAN", "route": "Balaban-Akdamar Adas\u0131-Geva\u015F-Edremit \xC7ar\u015F\u0131-Kocaeli Park\u0131--B\xF6lge Hastanesi--\u0130pekyolu Bulvar\u0131-Eski Emniyet Kav.-Mara\u015F Caddesi--Zaferler \u0130\xD6O-Depolama Alan\u0131", "departureTimes": ["09:00", "13:00", "17:00"], "returnTimes": ["07:00", "11:00", "15:00"], "stops": ["Balaban", "Akdamar Adas\u0131", "Geva\u015F", "Edremit \xC7ar\u015F\u0131", "Kocaeli Park\u0131", "B\xF6lge Hastanesi", "\u0130pekyolu Bulvar\u0131", "Eski Emniyet Kav.", "Mara\u015F Caddesi", "Zaferler \u0130\xD6O", "Depolama Alan\u0131"], "frequency": "G\xFCnde 3 sefer", "status": "Aktif", "tariff": "", "operatingHours": "09:00 - 17:00" },
  { "id": "v-live-180", "lineNo": "\xC7L1", "title": "\xC7L1 - \xC7ALDIRAN VAN OTOB\xDCS HAREKET SAATLER\u0130", "route": "Otogar-Erci\u015F Yolu Cad.-YY\xDC Kav\u015Fa\u011F\u0131-Erci\u015F Van Yolu-Erci\u015F Muradiye Yol Ayr\u0131m\u0131-Van Do\u011Fubeyaz\u0131t Yolu-Muradiye Kav\u015Fa\u011F\u0131- \xC7ald\u0131ran", "departureTimes": ["06:30 OTOGAR", "11:00 OTOGAR", "15:30 OTOGAR"], "returnTimes": ["08:15", "13:00", "17:00"], "stops": ["Otogar", "Erci\u015F Yolu Cad.", "YY\xDC Kav\u015Fa\u011F\u0131", "Erci\u015F Van Yolu", "Erci\u015F Muradiye Yol Ayr\u0131m\u0131", "Van Do\u011Fubeyaz\u0131t Yolu", "Muradiye Kav\u015Fa\u011F\u0131", "\xC7ald\u0131ran"], "frequency": "G\xFCnde 3 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 15:30" },
  { "id": "v-live-181", "lineNo": "\xC7T-1", "title": "\xC7T-1 - VAN \xC7ATAK OTOB\xDCS HAREKET SAATLER\u0130", "route": "Makine \u0130kmal Garaj\u0131-\u0130pekyolu Cad-Eski Emniyet Kav.-Karayollar\u0131 Kav.-Otogar-Eski Emniyet Kav\u015Fa\u011F\u0131-\u0130pekyolu Cad.-B\xF6lge Hastanesi-Edremit-\xC7i\xE7ekli-K\u0131z\u0131lta\u015F Mahallesi -G\xF6renta\u015F Mahallesi-\xC7atak", "departureTimes": ["06:30 OTOGAR", "15:00 OTOGAR"], "returnTimes": ["08:30", "17:00"], "stops": ["Makine \u0130kmal Garaj\u0131", "\u0130pekyolu Cad", "Eski Emniyet Kav.", "Karayollar\u0131 Kav.", "Otogar", "Eski Emniyet Kav\u015Fa\u011F\u0131", "\u0130pekyolu Cad.", "B\xF6lge Hastanesi", "Edremit", "\xC7i\xE7ekli", "K\u0131z\u0131lta\u015F Mahallesi", "G\xF6renta\u015F Mahallesi", "\xC7atak"], "frequency": "G\xFCnde 2 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 15:00" },
  { "id": "v-live-182", "lineNo": "GR1", "title": "GR1 - G\xDCRPINAR VAN OTOB\xDCS HAREKET SAATLER\u0130", "route": "Depolama Alan\u0131-Zaferler \u0130\xD6O-K\xFClt\xFCr Saray\u0131 Kav\u015Fa\u011F\u0131-Milli Egemenlik Cad.- Hayat Hastanesi Do\u011Fu Caddesi-\u0130kinisan Kav\u015Fa\u011F\u0131-Hac\u0131bekir Bulvar\u0131-Van Hakkar\u0131 Yolu- Kuruba\u015F-Tekstilkent- G\xFCrp\u0131nar Hakkar\u0131 Yol Ayr\u0131m\u0131-Bitlis Hakkari Yolu-G\xFCrp\u0131nar-G\xDCRPINAR DEVLET HASTANES\u0130", "departureTimes": ["07:00", "08:30", "10:30", "13:30", "16:00", "17:15", "18:30"], "returnTimes": ["07:00", "08:30", "10:30", "12:30", "16:15", "17:15", "18:30"], "stops": ["Depolama Alan\u0131", "Zaferler \u0130\xD6O", "K\xFClt\xFCr Saray\u0131 Kav\u015Fa\u011F\u0131", "Milli Egemenlik Cad.", "Hayat Hastanesi Do\u011Fu Caddesi", "\u0130kinisan Kav\u015Fa\u011F\u0131", "Hac\u0131bekir Bulvar\u0131", "Van Hakkar\u0131 Yolu", "Kuruba\u015F", "Tekstilkent", "G\xFCrp\u0131nar Hakkar\u0131 Yol Ayr\u0131m\u0131", "Bitlis Hakkari Yolu", "G\xFCrp\u0131nar", "G\xDCRPINAR DEVLET HASTANES\u0130"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 18:30" },
  { "id": "v-live-183", "lineNo": "GV1", "title": "GV1 - VAN GEVA\u015E OTOB\xDCS HAREKET SAATLER\u0130", "route": "Otogar- \u0130pekyolu Caddesi-B\xF6lge Hastanesi-Edremit \u0130l\xE7esi-\xC7i\xE7ekli- Van Bitlis Yolu- Geva\u015F Yol Ayr\u0131m\u0131-Atat\xFCrk Bulvar\u0131-Geva\u015F", "departureTimes": ["06:40 OTOGAR", "06:50 BE\u015EYOL", "08:15 OTOGAR", "09:30 OTOGAR", "11:00 OTOGAR", "13:30 OTOGAR", "15:30 OTOGAR", "17:30 OTOGAR", "19:00 OTOGAR"], "returnTimes": ["06:30", "08:15", "09:30", "11:00", "13:30", "15:30", "17:30", "18:30 H\u0130\u015EET MAHALLES\u0130", "19:00"], "stops": ["Otogar", "\u0130pekyolu Caddesi", "B\xF6lge Hastanesi", "Edremit \u0130l\xE7esi", "\xC7i\xE7ekli", "Van Bitlis Yolu", "Geva\u015F Yol Ayr\u0131m\u0131", "Atat\xFCrk Bulvar\u0131", "Geva\u015F"], "frequency": "G\xFCnde 9 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:40 - 19:00" },
  { "id": "v-live-184", "lineNo": "MR1", "title": "MR1 - MURAD\u0130YE VAN OTOB\xDCS HAREKET SAATLER\u0130", "route": "Otogar-Erci\u015F Yolu Cad.-YY\xDC Kav\u015Fa\u011F\u0131-Erci\u015F Van Yolu-Erci\u015F Muradiye Yol Ayr\u0131m\u0131-Van Do\u011Fubeyaz\u0131t Yolu-Muradiye Kav\u015Fa\u011F\u0131- Muradiye", "departureTimes": ["06:40 BE\u015EYOL", "06:50 OTOGAR", "11:10 OTOGAR", "15:35 OTOGAR"], "returnTimes": ["08:15", "13:20", "17:00"], "stops": ["Otogar", "Erci\u015F Yolu Cad.", "YY\xDC Kav\u015Fa\u011F\u0131", "Erci\u015F Van Yolu", "Erci\u015F Muradiye Yol Ayr\u0131m\u0131", "Van Do\u011Fubeyaz\u0131t Yolu", "Muradiye Kav\u015Fa\u011F\u0131", "Muradiye"], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:40 - 15:35" },
  { "id": "v-live-185", "lineNo": "\xD6Z-1", "title": "\xD6Z-1 - \xD6ZALP VAN OTOB\xDCS HAREKET SAATLER\u0130", "route": "Makine \u0130kmal Garaj\u0131-\u0130pekyolu Cad-Eski Emniyet Kav.-Karayollar\u0131 Kav.- Otogar-\xD6zalp Yolu Cad.-Er\xE7ek-\xD6zalp-\xD6zalp Saray Yolu-Saray", "departureTimes": ["06:45 OTOGAR", "07:00 OTOGAR", "11:00 OTOGAR", "13:00 OTOGAR", "15:30 OTOGAR", "16:30 OTOGAR"], "returnTimes": ["08:00 SARAY", "08:30 SARAY", "13:00 SARAY", "14:30 SARAY", "17:00 SARAY", "18:00 SARAY DEVLET HASTANES\u0130"], "stops": ["Makine \u0130kmal Garaj\u0131", "\u0130pekyolu Cad", "Eski Emniyet Kav.", "Karayollar\u0131 Kav.", "Otogar", "\xD6zalp Yolu Cad.", "Er\xE7ek", "\xD6zalp", "\xD6zalp Saray Yolu", "Saray"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:45 - 16:30" },
  { "id": "v-live-186", "lineNo": "SR1", "title": "SR1 - SARAY VAN OTOB\xDCS HAREKET SAATLER\u0130", "route": "Makine \u0130kmal Garaj\u0131-\u0130pekyolu Cad-Eski Emniyet Kav.-Karayollar\u0131 Kav.-Otogar-\xD6zalp Yolu Cad.-Er\xE7ek-\xD6zalp Kav\u015Fa\u011F\u0131-\xD6zalp Saray Yolu-Saray-Saray Devlet Hast.", "departureTimes": ["06:45 OTOGAR.", "07:00 OTOGAR", "11:00 OTOGAR", "13:00 OTOGAR", "15:30 OTOGAR", "16:30 OTOGAR"], "returnTimes": ["08:00 SARAY", "08:30 SARAY", "13:00 SARAY", "14:30 SARAY", "17:00 SARAY", "18:00 SARAY DEVLET HASTANES\u0130"], "stops": ["Makine \u0130kmal Garaj\u0131", "\u0130pekyolu Cad", "Eski Emniyet Kav.", "Karayollar\u0131 Kav.", "Otogar", "\xD6zalp Yolu Cad.", "Er\xE7ek", "\xD6zalp Kav\u015Fa\u011F\u0131", "\xD6zalp Saray Yolu", "Saray", "Saray Devlet Hast."], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:45 - 16:30" },
  { "id": "v-live-188", "lineNo": "101", "title": "101 - ERC\u0130\u015E \u0130L\xC7ES\u0130 YUKARI TOK\u0130", "route": "Erci\u015F Merkez-Yeni Hastane-Viar Dura\u011F\u0131-Van Yolu-Erci\u015F Van Yolu-Oto Sanayi-Haydarbey Kav\u015Fa\u011F\u0131-Yukar\u0131 Toki-Adnan Menderes Mah. U D\xF6n\xFC\u015F\xFC Haydabey Kav\u015Fa\u011F\u0131-Oto Sanayi- Erci\u015F Van Yolu-Van Yolu Caddesi-Viar Dura\u011F\u0131-Depolama Alan\u0131", "departureTimes": ["06:00", "06:30", "07:00", "08:00", "08:30", "09:30", "10:00", "11:00", "11:30", "12:30", "13:00", "14:00", "14:30", "15:30", "16:00", "17:00", "17:30", "18:30", "19:00", "20:00", "20:30", "21:30", "22:00"], "returnTimes": [], "stops": ["Erci\u015F Merkez", "Yeni Hastane", "Viar Dura\u011F\u0131", "Van Yolu", "Erci\u015F Van Yolu", "Oto Sanayi", "Haydarbey Kav\u015Fa\u011F\u0131", "Yukar\u0131 Toki", "Adnan Menderes Mah. U D\xF6n\xFC\u015F\xFC Haydabey Kav\u015Fa\u011F\u0131", "Oto Sanayi", "Erci\u015F Van Yolu", "Van Yolu Caddesi", "Viar Dura\u011F\u0131", "Depolama Alan\u0131"], "frequency": "G\xFCnde 23 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:00 - 22:00" },
  { "id": "v-live-189", "lineNo": "102", "title": "102 - ERC\u0130\u015E \u0130L\xC7ES\u0130 A\u015EA\u011EI TOK\u0130", "route": "Erci\u015F Merkez-Yeni Hastane-Viar Dura\u011F\u0131-Van Yolu-Erci\u015F Van Yolu-Oto Sanayi-Karada\u015Flar Mevkii- Emniyet M\xFCd\xFCrl\xFC\u011F\xFC-A\u015Fa\u011F\u0131 Toki-\xD6\u011Fretmenler Evi- U d\xF6n\xFC\u015F\xFC-Toki Yolu \u2013Emniyet Amirli\u011Fi\u2014Oto Sanayi- Erci\u015F Van Yolu-Van Yolu Caddesi-Viar Dura\u011F\u0131- Depolama alan\u0131", "departureTimes": ["06:00", "06:30", "07:00", "08:00", "08:30", "09:30", "10:00", "11:00", "11:30", "12:30", "13:00", "14:00", "14:30", "15:30", "16:00", "17:00", "17:30", "18:30", "19:00", "20:00", "20:30", "21:30", "22:00"], "returnTimes": [], "stops": ["Erci\u015F Merkez", "Yeni Hastane", "Viar Dura\u011F\u0131", "Van Yolu", "Erci\u015F Van Yolu", "Oto Sanayi", "Karada\u015Flar Mevkii", "Emniyet M\xFCd\xFCrl\xFC\u011F\xFC", "A\u015Fa\u011F\u0131 Toki", "\xD6\u011Fretmenler Evi", "U d\xF6n\xFC\u015F\xFC", "Toki Yolu \u2013Emniyet Amirli\u011Fi\u2014Oto Sanayi", "Erci\u015F Van Yolu", "Van Yolu Caddesi", "Viar Dura\u011F\u0131", "Depolama alan\u0131"], "frequency": "G\xFCnde 23 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:00 - 22:00" },
  { "id": "v-live-190", "lineNo": "201", "title": "201 - HAYDARBEY-KAD\u0130RASKER", "route": "Otob\xFCs Hareket Amirli\u011Fi-Eski Ruspazar\u0131-Viar Dura\u011F\u0131-Karata\u015Flar Sanayi Sitesi-Emniyet M\xFCd\xFCrl\xFC\u011F\xFC-\xD6\u011Fretmen Evi Kav\u015Fa\u011F\u0131-Sahil Yolu-Haydarbey Mahallesi-Kadirasker Mahallesi U D\xF6n\xFC\u015F\xFC-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 HAYDARBEY-KAD\u0130RASKER", "09:00 HAYDARBEY-KAD\u0130RASKER", "11:00 HAYDARBEY-KAD\u0130RASKER", "13:00 HAYDARBEY-KAD\u0130RASKER", "15:00 HAYDARBEY-KAD\u0130RASKER", "17:15 HAYDARBEY-KAD\u0130RASKER"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Eski Ruspazar\u0131", "Viar Dura\u011F\u0131", "Karata\u015Flar Sanayi Sitesi", "Emniyet M\xFCd\xFCrl\xFC\u011F\xFC", "\xD6\u011Fretmen Evi Kav\u015Fa\u011F\u0131", "Sahil Yolu", "Haydarbey Mahallesi", "Kadirasker Mahallesi U D\xF6n\xFC\u015F\xFC", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:15" },
  { "id": "v-live-192", "lineNo": "301", "title": "301 - YUKARI I\u015EIKLI-LAT\u0130F\u0130YE", "route": "Otob\xFCs Hareket Amirli\u011Fi-Dalan Caddesi-Manolya Pastanesi-Zeylan Caddesi Simeklio\u011Flu Petrol Kav\u015Fa\u011F\u0131- Yukar\u0131 I\u015F\u0131kl\u0131- Afat Evleri U D\xF6n\xFC\u015F\xFC-Yukar\u0131 I\u015F\u0131kl\u0131 K\xF6y Meydan\u0131-Sa\u011Fl\u0131k Oca\u011F\u0131-Zilan Deresi-Servis Yolu-Otagar I\u015F\u0131klar\u0131-A\u015Fa\u011F\u0131 I\u015F\u0131kl\u0131-Hidroelektrik Santrali-Latifiye-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 YUKARI I\u015EIKLI-LAT\u0130F\u0130YE", "09:00 YUKARI I\u015EIKLI-LAT\u0130F\u0130YE", "11:00 YUKARI I\u015EIKLI-LAT\u0130F\u0130YE", "13:00 YUKARI I\u015EIKLI-LAT\u0130F\u0130YE", "15:00 YUKARI I\u015EIKLI-LAT\u0130F\u0130YE", "16:10 YUKARI I\u015EIKLI-LAT\u0130F\u0130YE"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Dalan Caddesi", "Manolya Pastanesi", "Zeylan Caddesi Simeklio\u011Flu Petrol Kav\u015Fa\u011F\u0131", "Yukar\u0131 I\u015F\u0131kl\u0131", "Afat Evleri U D\xF6n\xFC\u015F\xFC", "Yukar\u0131 I\u015F\u0131kl\u0131 K\xF6y Meydan\u0131", "Sa\u011Fl\u0131k Oca\u011F\u0131", "Zilan Deresi", "Servis Yolu", "Otagar I\u015F\u0131klar\u0131", "A\u015Fa\u011F\u0131 I\u015F\u0131kl\u0131", "Hidroelektrik Santrali", "Latifiye", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 16:10" },
  { "id": "v-live-193", "lineNo": "310", "title": "310 - SALMANA\u011EA-SAL\u0130H\u0130YE-YE\u015E\u0130LOVA-PINARLI", "route": "Otob\xFCs Hareket Amirli\u011Fi-H\xFCk\xFCmet Kona\u011F\u0131 Arkas\u0131-Yeni Belediye Binas\u0131-Tugay Yolu- Salihiye Mahallesi -Kanalboyu-Erci\u015F Van Karayolu-Yeni Belediye Binas\u0131-Atakan \xC7elik Caddesi- Kozluca-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 PINARLI", "08:10 SALMANA\u011EA", "11:00 SAL\u0130H\u0130YE", "14:00 SAL\u0130H\u0130YE", "15:00 YE\u015E\u0130LOVA", "15:30 SALMANA\u011EA"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "H\xFCk\xFCmet Kona\u011F\u0131 Arkas\u0131", "Yeni Belediye Binas\u0131", "Tugay Yolu", "Salihiye Mahallesi", "Kanalboyu", "Erci\u015F Van Karayolu", "Yeni Belediye Binas\u0131", "Atakan \xC7elik Caddesi", "Kozluca", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 15:30" },
  { "id": "v-live-195", "lineNo": "410-210", "title": "410-210 - DEL\u0130\xC7AY-ERG\xDCC\xDC-KEKL\u0130KOVA", "route": "Otob\xFCs Hareket Amirli\u011Fi-Tugay Caddesi-Yeni Belediye Binas\u0131-Tugay Yolu -Keklikova-Erg\xFCc\xFC-Deli\xE7ay", "departureTimes": ["06:30 DEL\u0130\xC7AY-ERG\xDCC\xDC-KEKL\u0130KOVA", "08:30 \xC7OBAND\xDCZ\xDC", "13:00 DEL\u0130\xC7AY-ERG\xDCC\xDC-KEKL\u0130KOVA", "14:30 \xC7OBAND\xDCZ\xDC", "15:30 DEL\u0130\xC7AY-ERG\xDCC\xDC-KEKL\u0130KOVA"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Tugay Caddesi", "Yeni Belediye Binas\u0131", "Tugay Yolu", "Keklikova", "Erg\xFCc\xFC", "Deli\xE7ay"], "frequency": "G\xFCnde 5 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 15:30" },
  { "id": "v-live-196", "lineNo": "501", "title": "501 - KOCAPINAR-\xC7ET\u0130NTA\u015E-PINARLI", "route": "Otob\xFCs Hareket Amirli\u011Fi-Dalan Caddesi-Manolya Pastanesi-Otogar-A\u015Fa\u011F\u0131 I\u015F\u0131kl\u0131-G\xF6z\xFCtok Mahallesi-Ekiciler Mahallesi-Kocap\u0131nar Mahallesi-\xC7etinta\u015F Mahallesi-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 KOCAPINAR-\xC7ET\u0130NTA\u015E", "09:00 KOCAPINAR-\xC7ET\u0130NTA\u015E", "11:00 KOCAPINAR-\xC7ET\u0130NTA\u015E", "13:00 KOCAPINAR-\xC7ET\u0130NTA\u015E", "15:00 KOCAPINAR-PINARLI", "17:00 KOCAPINAR-\xC7ET\u0130NTA\u015E"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Dalan Caddesi", "Manolya Pastanesi", "Otogar", "A\u015Fa\u011F\u0131 I\u015F\u0131kl\u0131", "G\xF6z\xFCtok Mahallesi", "Ekiciler Mahallesi", "Kocap\u0131nar Mahallesi", "\xC7etinta\u015F Mahallesi", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:00" },
  { "id": "v-live-199", "lineNo": "603", "title": "603 - \xC7ELEB\u0130BA\u011EI-A\u011EAMSAT", "route": "Askerlik \u015Eubesi Arkas\u0131-K\u0131\u015Fla Yolu-\xD6rene Yolu-\xC7elebiba\u011F\u0131 Yolu-A\u011Famast Mahallesi-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 A\u011EAMAST", "09:00 A\u011EAMAST", "11:00 A\u011EAMAST", "13:00 A\u011EAMAST", "15:00 A\u011EAMAST", "16:45 A\u011EAMAST"], "returnTimes": [], "stops": ["Askerlik \u015Eubesi Arkas\u0131", "K\u0131\u015Fla Yolu", "\xD6rene Yolu", "\xC7elebiba\u011F\u0131 Yolu", "A\u011Famast Mahallesi", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 16:45" },
  { "id": "v-live-200", "lineNo": "604-601", "title": "604-601 - \xC7ELEB\u0130BA\u011EI-AFAT EVLER\u0130-\xC7ATAKD\u0130B\u0130-\xD6RENEDEM\u0130", "route": "Askerlik \u015Eube Arkas\u0131 - K\u0131\u015Fla Caddesi - \xD6rene Yolu -\xC7atakdibi-Cihang\xF6ren Yolu-Kas\u0131mba\u011F\u0131-Afat Evleri -Jandarma Karakolu - Adilcevaz Yolu-Bayraml\u0131-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 BAYRAMLI", "08:00 \xC7ATAKD\u0130B\u0130-AFAT EVLER\u0130", "11:00 YE\u015E\u0130LOVA", "13:00 \xC7ATAKD\u0130B\u0130-AFAT EVLER\u0130", "14:00 BAYRAMLI", "15:30 BAYRAMLI"], "returnTimes": [], "stops": ["Askerlik \u015Eube Arkas\u0131", "K\u0131\u015Fla Caddesi", "\xD6rene Yolu", "\xC7atakdibi", "Cihang\xF6ren Yolu", "Kas\u0131mba\u011F\u0131", "Afat Evleri", "Jandarma Karakolu", "Adilcevaz Yolu", "Bayraml\u0131", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 15:30" },
  { "id": "v-live-202", "lineNo": "701", "title": "701 - TEKEVLER-ALKANAT", "route": "Otob\xFCs Hareket Amirli\u011Fi-Viar Arkas\u0131- Eski Cac\u0131k Meydan\u0131-Tekevler Mahallesi-Deniz Mahallesi-Med T\u0131p Merkezi-Eski Hastane \u2013Yeni Hastane-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 TEKEVLER", "09:00 TEKEVLER", "11:00 TEKEVLER", "13:00 TEKEVLER", "15:00 TEKEVLER", "16:30 TEKEVLER"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Viar Arkas\u0131", "Eski Cac\u0131k Meydan\u0131", "Tekevler Mahallesi", "Deniz Mahallesi", "Med T\u0131p Merkezi", "Eski Hastane \u2013Yeni Hastane", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 16:30" },
  { "id": "v-live-204", "lineNo": "720-815", "title": "720-815 - \xC7INARLI-HURDACILAR-SAL\u0130H\u0130YE", "route": "\xC7\u0131narl\u0131 Mahallesi G\xFCzergah\u0131:Otob\xFCs Hareket Amirli\u011Fi-\u015Eehitler Caddesi-Yeni Hastane-\xC7\u0131narl\u0131 Mahallesi-Hurdac\u0131lar Sitesi Ye\u015Filova Mahallesi G\xFCzergah\u0131:Dalan Caddesi-Manolya Pastanesi-Askerlik \u015Eubesi-K\u0131\u015Fla Mahallesi-Mal Meydan\u0131-Mezbahane Yolu-Nato Yolu", "departureTimes": ["07:00 \xC7INARLI", "09:00 SAL\u0130H\u0130YE", "09:30 \xC7INARLI", "11:00 \xC7INARLI", "13:00 \xC7INARLI", "15:00 \xC7INARLI", "16:30 \xC7INARLI"], "returnTimes": [], "stops": ["\xC7\u0131narl\u0131 Mahallesi G\xFCzergah\u0131:Otob\xFCs Hareket Amirli\u011Fi", "\u015Eehitler Caddesi", "Yeni Hastane", "\xC7\u0131narl\u0131 Mahallesi", "Hurdac\u0131lar Sitesi Ye\u015Filova Mahallesi G\xFCzergah\u0131:Dalan Caddesi", "Manolya Pastanesi", "Askerlik \u015Eubesi", "K\u0131\u015Fla Mahallesi", "Mal Meydan\u0131", "Mezbahane Yolu", "Nato Yolu"], "frequency": "G\xFCnde 7 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 16:30" },
  { "id": "v-live-207", "lineNo": "643", "title": "643 - HIDIR-AK\xC7A\xD6REN", "route": "Ak\xE7a\xF6ren-Yemlice-Ocakl\u0131-H\u0131d\u0131r-Otluca-G\xFCls\xFCnler-K\xF6pr\xFCk\xF6y-\xD6zkaynak-Yumrutepe-AMATEM-Erci\u015F yolu-Otogar-Karayollar\u0131 Kav.-Eski Emniyet-S\u0131hke Cad.-Be\u015Fyol-\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["06:00 MAK\u0130NE \u0130KMAL GARAJI", "07:00 AK\xC7A\xD6REN"], "returnTimes": ["16:15 OTOB\xDCS HAREKET AM\u0130RL\u0130\u011E\u0130", "16:30 \u0130SKELE CADDES\u0130 MUZZY DURA\u011EI"], "stops": ["Ak\xE7a\xF6ren", "Yemlice", "Ocakl\u0131", "H\u0131d\u0131r", "Otluca", "G\xFCls\xFCnler", "K\xF6pr\xFCk\xF6y", "\xD6zkaynak", "Yumrutepe", "AMATEM", "Erci\u015F yolu", "Otogar", "Karayollar\u0131 Kav.", "Eski Emniyet", "S\u0131hke Cad.", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 2 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:00 - 07:00" },
  { "id": "v-live-208", "lineNo": "634", "title": "634 - BARDAK\xC7I TOK\u0130-TU\u015EBA TOK\u0130", "route": "Tu\u015Fba Toki-Bardak\xE7\u0131 Toki -Ara\u015Ft\u0131rma Hast.-Erci\u015F Yolu-Otogar Kav - Karayollar\u0131 Kav\u015Fa\u011F\u0131-Eski Emniyet Kav.-S\u0131hke Caddesi-Be\u015Fyol-\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00", "08:00 EK ARA\xC7", "10:30 EK ARA\xC7", "12:00", "13:30 EK ARA\xC7", "15:15", "18:30", "21:00"], "returnTimes": ["07:00 EK ARA\xC7", "08:00", "09:15 EK ARA\xC7", "10:30", "12:00 EK ARA\xC7", "13:30", "15:30 EK ARA\xC7", "17:00", "18:00 EK ARA\xC7", "20:00", "22:00"], "stops": ["Tu\u015Fba Toki", "Bardak\xE7\u0131 Toki", "Ara\u015Ft\u0131rma Hast.", "Erci\u015F Yolu", "Otogar Kav", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "Eski Emniyet Kav.", "S\u0131hke Caddesi", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 8 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 21:00" },
  { "id": "v-live-209", "lineNo": "800-802", "title": "800-802 - ER\xC7EK-KARAG\xDCND\xDCZ MAHALLES\u0130", "route": "Gidi\u015F G\xFCzergah\u0131:Akk\xF6pr\xFC Deresi-H\u0131d\u0131rellez Caddesi-Otogar Kav\u015Fa\u011F\u0131-\xD6zalp Saray Yolu-Er\xE7ek Mahallesi-Karag\xFCnd\xFCz Mahallesi D\xF6n\xFC\u015F G\xFCzergah\u0131:Karag\xFCnd\xFCz Mahallesi-Er\xE7ek Mahallesi-\xD6zalp Saray Yolu-Otogar Kav\u015Fa\u011F\u0131-Eski Emniyet Kav\u015Fa\u011F\u0131-S\u0131hke Cad-Be\u015Fyol", "departureTimes": ["06:45 KARAG\xDCND\xDCZ", "09:15 MERKEZ", "14:40 MERKEZ", "17:30 MERKEZ"], "returnTimes": [], "stops": ["Gidi\u015F G\xFCzergah\u0131:Akk\xF6pr\xFC Deresi", "H\u0131d\u0131rellez Caddesi", "Otogar Kav\u015Fa\u011F\u0131", "\xD6zalp Saray Yolu", "Er\xE7ek Mahallesi", "Karag\xFCnd\xFCz Mahallesi D\xF6n\xFC\u015F G\xFCzergah\u0131:Karag\xFCnd\xFCz Mahallesi", "Er\xE7ek Mahallesi", "\xD6zalp Saray Yolu", "Otogar Kav\u015Fa\u011F\u0131", "Eski Emniyet Kav\u015Fa\u011F\u0131", "S\u0131hke Cad", "Be\u015Fyol"], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:45 - 17:30" },
  { "id": "v-live-210", "lineNo": "120", "title": "120 - EDREM\u0130T MERKEZ ESK\u0130 TOK\u0130 K\u0130RACILAR TOK\u0130 YEN\u0130 TOK\u0130", "route": "Edremit Merkez-Kocaeli Park\u0131-Seyir Tepesi-Eski Toki-Kirac\u0131lar Toki-Yeni Toki-Edremit Mahallei\xE7i", "departureTimes": ["07:00", "08:00", "09:30 ARIZALI", "11:00", "14:00", "15:20", "16:30", "17:45", "19:00"], "returnTimes": [], "stops": ["Edremit Merkez", "Kocaeli Park\u0131", "Seyir Tepesi", "Eski Toki", "Kirac\u0131lar Toki", "Yeni Toki", "Edremit Mahallei\xE7i"], "frequency": "G\xFCnde 9 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 19:00" },
  { "id": "v-live-213", "lineNo": "812", "title": "812 - HASANABDAL-OYALI-DER\u0130MEV\u0130-YE\u015E\u0130LOVA", "route": "Hasanabdal G\xFCzergah\u0131:Zeylan Cad-Simeklio\u011Flu Petrol-Yukar\u0131 I\u015F\u0131kl\u0131-\xC7ak\u0131rbey-Hasanabdal-Otob\xFCs Hareket Amirli\u011Fi Oyal\u0131 Derimevi G\xFCzergah\u0131:Zeylan Cad-Simeklio\u011Flu Petrol-Yukar\u0131 I\u015F\u0131kl\u0131-Derimevi-Oyal\u0131", "departureTimes": ["07:00 HASANABDAL", "09:00 OYALI-DER\u0130MEV\u0130", "12:00 HASANABDAL", "13:00 YE\u015E\u0130LOVA", "15:30 HASANABDAL"], "returnTimes": [], "stops": ["Hasanabdal G\xFCzergah\u0131:Zeylan Cad", "Simeklio\u011Flu Petrol", "Yukar\u0131 I\u015F\u0131kl\u0131", "\xC7ak\u0131rbey", "Hasanabdal", "Otob\xFCs Hareket Amirli\u011Fi Oyal\u0131 Derimevi G\xFCzergah\u0131:Zeylan Cad", "Simeklio\u011Flu Petrol", "Yukar\u0131 I\u015F\u0131kl\u0131", "Derimevi", "Oyal\u0131"], "frequency": "G\xFCnde 5 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 15:30" },
  { "id": "v-live-214", "lineNo": "202", "title": "202 - ERC\u0130\u015E-\xDCNSEL\u0130-MURAD\u0130YE", "route": "Erci\u015F-\xDCnseli-Alkasnak-Ke\xE7ik\u0131ran-Karahan-Muradiye Devlet Hastanesi-Muradiye Belediyesi-Muradiye", "departureTimes": ["07:00 ERC\u0130\u015E-\xDCNSEL\u0130-MURAD\u0130YE", "13:00 ERC\u0130\u015E \xDCNSEL\u0130-MURAD\u0130YE", "14:45 MURAD\u0130YE-\xDCNSEL\u0130-ERC\u0130\u015E", "15:45 ERC\u0130\u015E \xDCNSEL\u0130-MURAD\u0130YE", "17:00 MURAD\u0130YE-\xDCNSEL\u0130-ERC\u0130\u015E"], "returnTimes": ["07:00 ERC\u0130\u015E-\xDCNSEL\u0130-MURAD\u0130YE", "08:15 MURAD\u0130YE-\xDCNSEL\u0130-ERC\u0130\u015E", "13:00 ERC\u0130\u015E-\xDCNSEL\u0130-MURAD\u0130YE", "14:45 MURAD\u0130YE-\xDCNSEL\u0130-ERC\u0130\u015E"], "stops": ["Erci\u015F", "\xDCnseli", "Alkasnak", "Ke\xE7ik\u0131ran", "Karahan", "Muradiye Devlet Hastanesi", "Muradiye Belediyesi", "Muradiye"], "frequency": "G\xFCnde 5 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:00" },
  { "id": "v-live-215", "lineNo": "BF-100", "title": "BF-100 - B\xD6LGE HASTANES\u0130-YY\xDC HASTANES\u0130-F T\u0130P\u0130 CEZA EV\u0130", "route": "B\xF6lge Hastanesi-\u0130pekyolu Caddesi-Emniyet Kav.-Otogar Kav\u015Fa\u011F\u0131- Erci\u015F Yolu-YY\xDC Ara\u015Ft\u0131rma Hastanesi- Amatem-\xC7ematem-F Tipi Cezaevi-Yumrutepe", "departureTimes": ["06:50 MEMURSEN TOK\u0130", "07:00", "09:30", "12:00", "15:00", "17:15"], "returnTimes": ["08:15", "10:45", "13:15", "16:20", "18:15"], "stops": ["B\xF6lge Hastanesi", "\u0130pekyolu Caddesi", "Emniyet Kav.", "Otogar Kav\u015Fa\u011F\u0131", "Erci\u015F Yolu", "YY\xDC Ara\u015Ft\u0131rma Hastanesi", "Amatem", "\xC7ematem", "F Tipi Cezaevi", "Yumrutepe"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:50 - 17:15" },
  { "id": "v-live-217", "lineNo": "BK-400", "title": "BK-400 - BOSTAN\u0130\xC7\u0130 TOK\u0130-KAMP\xDCS", "route": "1.G\xDCZERG\xC2H- Bostani\xE7i Toki-Veteriner Caddesi-\u0130kizler-S\u0131hke Cad-Emniyet Kav\u015Fa\u011F\u0131-Otogar Kav\u015Fa\u011F\u0131-Sanayi Kav\u015Fa\u011F\u0131-Erci\u015F Yolu-YY\xDC Ara\u015Ft\u0131rmaHastanesi-Kamp\xFCs \u2022 2.G\xDCZERG\xC2H- Bostani\xE7i Toki-Huzur Caddesi-Bar\u0131\u015F Caddesi-\u015Eerefiye Yeni Mah. - Demir K\xF6pr\xFC-Orhan Do\u011Fan Cad.- Nuda K\xFClt\xFCr Merkezi- Sebze Hali- \u015Eabaniye Cad- \u0130pekyolu Cad-Eski Emniyet Kav\u015Fa\u011F\u0131-Otogar Kav\u015Fa\u011F\u0131-Erci\u015F Yolu \xDCzeri-Kamp\xFCs", "departureTimes": ["06:30 BOSTAN\u0130\xC7\u0130 \u015EABAN\u0130YE", "06:40 Nuda K\xFClt\xFCr Merkezi \u015EABAN\u0130YE", "09:30 BOSTAN\u0130\xC7\u0130 BE\u015EYOL", "15:00 BOSTAN\u0130\xC7\u0130 \u015EABAN\u0130YE"], "returnTimes": ["08:15 KAMP\xDCS \u015EABAN\u0130YE", "11:00 KAMP\xDCS - SIHKE CADES\u0130", "13:30 KAMP\xDCS SIHKE CADES\u0130", "16:15 TARIM Lisesi \u015EABAN\u0130YE"], "stops": ["1.G\xDCZERG\xC2H", "Bostani\xE7i Toki", "Veteriner Caddesi", "\u0130kizler", "S\u0131hke Cad", "Emniyet Kav\u015Fa\u011F\u0131", "Otogar Kav\u015Fa\u011F\u0131", "Sanayi Kav\u015Fa\u011F\u0131", "Erci\u015F Yolu", "YY\xDC Ara\u015Ft\u0131rmaHastanesi", "Kamp\xFCs \u2022 2.G\xDCZERG\xC2H", "Bostani\xE7i Toki", "Huzur Caddesi", "Bar\u0131\u015F Caddesi", "\u015Eerefiye Yeni Mah.", "Demir K\xF6pr\xFC", "Orhan Do\u011Fan Cad.", "Nuda K\xFClt\xFCr Merkezi", "Sebze Hali", "\u015Eabaniye Cad", "\u0130pekyolu Cad", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Otogar Kav\u015Fa\u011F\u0131", "Erci\u015F Yolu \xDCzeri", "Kamp\xFCs"], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:30 - 15:00" },
  { "id": "v-live-220", "lineNo": "OB-650", "title": "OB-650 - OTOGAR-B\xDCY\xDCK\u015EEH\u0130R BELED\u0130YES\u0130", "route": "OTOGAR-ESK\u0130 MEYDAN KAV\u015EA\u011EI-MARANGOZLAR S\u0130TES\u0130-\xC7ALI DURA\u011EI-\u0130SKELE CADDES\u0130-YEN\u0130 EMN\u0130YET KAV\u015EA\u011EI-SEMAVER KAV\u015EA\u011EI-SIHKE CADDES\u0130-BE\u015EYOL-\u0130K\u0130ZLER-K\xDCLT\xDCR KAV\u015EA\u011EI-HAYAT HASTANES\u0130-EREK DA\u011EI CADDES\u0130- B\xDCY\xDCK\u015EEH\u0130R BELED\u0130YES\u0130", "departureTimes": ["07:00 SIHKE CADDES\u0130"], "returnTimes": ["17:10 SIHKE CADDES\u0130"], "stops": ["OTOGAR", "ESK\u0130 MEYDAN KAV\u015EA\u011EI", "MARANGOZLAR S\u0130TES\u0130", "\xC7ALI DURA\u011EI", "\u0130SKELE CADDES\u0130", "YEN\u0130 EMN\u0130YET KAV\u015EA\u011EI", "SEMAVER KAV\u015EA\u011EI", "SIHKE CADDES\u0130", "BE\u015EYOL", "\u0130K\u0130ZLER", "K\xDCLT\xDCR KAV\u015EA\u011EI", "HAYAT HASTANES\u0130", "EREK DA\u011EI CADDES\u0130", "B\xDCY\xDCK\u015EEH\u0130R BELED\u0130YES\u0130"], "frequency": "G\xFCnde 1 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 07:00" },
  { "id": "v-live-221", "lineNo": "610", "title": "610 - KARLIYAYLA-\xC7\u0130MEN", "route": "Erci\u015F Merkez-\xC7elebiba\u011F\u0131-Tekler-\xC7imen-Karl\u0131yayla-Bayraml\u0131 Yol Ayr\u0131m\u0131-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 KARLIYAYLA-\xC7\u0130MEN", "12:00 KARLIYAYLA-\xC7\u0130MEN", "15:00 KARLIYAYLA-\xC7\u0130MEN"], "returnTimes": [], "stops": ["Erci\u015F Merkez", "\xC7elebiba\u011F\u0131", "Tekler", "\xC7imen", "Karl\u0131yayla", "Bayraml\u0131 Yol Ayr\u0131m\u0131", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 3 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 15:00" },
  { "id": "v-live-224", "lineNo": "801", "title": "801 - ILIKAYNAK-A\u015EA\u011EI VE YUKARI G\xD6LALAN", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-Muzy Dura\u011F\u0131-Ko\xE7ibey Caddesi-H\u0131d\u0131relyez Caddesi-Otogar -\xD6zalp Saray Yolu-Er\xE7ek-Il\u0131kaynak-A\u015Fa\u011F\u0131g\xF6lalan-Yukar\u0131 G\xF6lalan-Yukar\u0131 G\xF6lalan-A\u015Fa\u011F\u0131g\xF6lalan-Il\u0131kaynak-Er\xE7ek-\xD6zalp Saray Yolu- Otogar Kav\u015Fa\u011F\u0131-Karayollar\u0131 Kav\u015Fa\u011F\u0131-Eski Emn. Kav.-S\u0131hke Cad-Be\u015Fyol-\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 MUZZY DURA\u011EI", "08:00 YUKARIG\xD6LALAN", "15:40 OTOB\xDCS HAREKET AM\u0130RL\u0130\u011E\u0130", "16:00 MUZZY DURA\u011EI"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "Muzy Dura\u011F\u0131", "Ko\xE7ibey Caddesi", "H\u0131d\u0131relyez Caddesi", "Otogar", "\xD6zalp Saray Yolu", "Er\xE7ek", "Il\u0131kaynak", "A\u015Fa\u011F\u0131g\xF6lalan", "Yukar\u0131 G\xF6lalan", "Yukar\u0131 G\xF6lalan", "A\u015Fa\u011F\u0131g\xF6lalan", "Il\u0131kaynak", "Er\xE7ek", "\xD6zalp Saray Yolu", "Otogar Kav\u015Fa\u011F\u0131", "Karayollar\u0131 Kav\u015Fa\u011F\u0131", "Eski Emn. Kav.", "S\u0131hke Cad", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 16:00" },
  { "id": "v-live-226", "lineNo": "657", "title": "657 - GENDELOVA-\xC7OMAKLI-KOZLUCA-YALNIZA\u011EA\xC7", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-Alipa\u015Fa Mah.-Otogar -\xD6zalp Saray Yolu-Gendelova-\xC7omakl\u0131-Kozluca-Yaln\u0131za\u011Fa\xE7", "departureTimes": ["07:00 YALNIZA\u011EA\xC7", "16:00 MERKEZ"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "Alipa\u015Fa Mah.", "Otogar", "\xD6zalp Saray Yolu", "Gendelova", "\xC7omakl\u0131", "Kozluca", "Yaln\u0131za\u011Fa\xE7"], "frequency": "G\xFCnde 2 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 16:00" },
  { "id": "v-live-228", "lineNo": "658-659", "title": "658-659 - ESENPINAR-HALKALI-YAYLIYAKA-\u015EAHGELD\u0130-TABANLI-P\u0130RGAR\u0130P", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-Muzy Dura\u011F\u0131-Ko\xE7ibey Caddesi-H\u0131d\u0131relyez Caddesi-Erci\u015F Yolu \xDCzeri-Otogar-Sanayi Sitesi-Organize Kav\u015Fa\u011F\u0131-F-Tipi Cezaevi-Alak\xF6y Kav\u015Fa\u011F\u0131-Esenp\u0131nar-Halkal\u0131-Yayl\u0131yaka-\u015Eahgeldi-Tabanl\u0131-Pirgarip-\u015Eahgeldi-Tabanl\u0131-Pirgarip-Yayl\u0131yaka-Halkal\u0131-Esenp\u0131nar-Alak\xF6y Kav\u015Fa\u011F\u0131-F-Tipi Cezaevi-Organize Kav\u015Fa\u011F\u0131-Sanayi Sitesi-Otogar-Eski Emniyet Kav\u015Fa\u011F\u0131-S\u0131hke Caddesi-Be\u015Fyol-\u0130kizler-Ters Ev-Otob\xFCs Hareket Amirli\u011Fi", "departureTimes": ["07:00 ESENPINAR.", "16:00 MERKEZ"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "Muzy Dura\u011F\u0131", "Ko\xE7ibey Caddesi", "H\u0131d\u0131relyez Caddesi", "Erci\u015F Yolu \xDCzeri", "Otogar", "Sanayi Sitesi", "Organize Kav\u015Fa\u011F\u0131", "F", "Tipi Cezaevi", "Alak\xF6y Kav\u015Fa\u011F\u0131", "Esenp\u0131nar", "Halkal\u0131", "Yayl\u0131yaka", "\u015Eahgeldi", "Tabanl\u0131", "Pirgarip", "\u015Eahgeldi", "Tabanl\u0131", "Pirgarip", "Yayl\u0131yaka", "Halkal\u0131", "Esenp\u0131nar", "Alak\xF6y Kav\u015Fa\u011F\u0131", "F", "Tipi Cezaevi", "Organize Kav\u015Fa\u011F\u0131", "Sanayi Sitesi", "Otogar", "Eski Emniyet Kav\u015Fa\u011F\u0131", "S\u0131hke Caddesi", "Be\u015Fyol", "\u0130kizler", "Ters Ev", "Otob\xFCs Hareket Amirli\u011Fi"], "frequency": "G\xFCnde 2 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 16:00" },
  { "id": "v-live-229", "lineNo": "117", "title": "117 - \xC7AVU\u015ETEPE-ZERNEK-HO\u015EAP", "route": "Harket Merkezi-Zaferler \u0130\xD6O-K\xFClt\xFCr Saray\u0131 Kav\u015Fa\u011F\u0131- Milli Egemenlik Cad.- Hayat Hastanesi Do\u011Fu Caddesi-\u0130kinisan Kav\u015Fa\u011F\u0131-Hac\u0131bekir Bulvar\u0131-Van Hakkar\u0131 Yolu- Kuruba\u015F-Tekstilkent- G\xFCrp\u0131nar-\xC7avu\u015Ftepe-Zernek Baraj\u0131-Ho\u015Fap", "departureTimes": ["06:45 MERKEZ", "15:30"], "returnTimes": ["08:30", "17:00"], "stops": ["Harket Merkezi", "Zaferler \u0130\xD6O", "K\xFClt\xFCr Saray\u0131 Kav\u015Fa\u011F\u0131", "Milli Egemenlik Cad.", "Hayat Hastanesi Do\u011Fu Caddesi", "\u0130kinisan Kav\u015Fa\u011F\u0131", "Hac\u0131bekir Bulvar\u0131", "Van Hakkar\u0131 Yolu", "Kuruba\u015F", "Tekstilkent", "G\xFCrp\u0131nar", "\xC7avu\u015Ftepe", "Zernek Baraj\u0131", "Ho\u015Fap"], "frequency": "G\xFCnde 2 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:45 - 15:30" },
  { "id": "v-live-230", "lineNo": "100", "title": "100 - VAN BA\u015EKALE", "route": "Gidi\u015F G\xFCzergah\u0131:Otogar-Eski Emniyet Kav\u015Fa\u011F\u0131-\xC7atak Dura\u011F\u0131-\u015Eabaniye Caddesi- Kuruba\u015F- Zernek Baraj\u0131-Ho\u015Fap-Albayrak Yol Ayr\u0131m\u0131-Ba\u015Fkale D\xF6n\xFC\u015F G\xFCzergah\u0131:Ba\u015Fkale-Albayrak Yol Ayr\u0131m\u0131-Ho\u015Fap- Zernek Baraj\u0131-Kuruba\u015F--\u015Eabaniye Caddesi-\xC7atak Dura\u011F\u0131-Eski Emniyet Kav\u015Fa\u011F\u0131-Otogar", "departureTimes": ["06:10 (MAK\u0130NE \u0130KMAL GARAJI)", "06:30 OTOGAR", "08:30 BA\u015EKALE", "15:00 OTOGAR", "17:05 BA\u015EKALE"], "returnTimes": [], "stops": ["Gidi\u015F G\xFCzergah\u0131:Otogar", "Eski Emniyet Kav\u015Fa\u011F\u0131", "\xC7atak Dura\u011F\u0131", "\u015Eabaniye Caddesi", "Kuruba\u015F", "Zernek Baraj\u0131", "Ho\u015Fap", "Albayrak Yol Ayr\u0131m\u0131", "Ba\u015Fkale D\xF6n\xFC\u015F G\xFCzergah\u0131:Ba\u015Fkale", "Albayrak Yol Ayr\u0131m\u0131", "Ho\u015Fap", "Zernek Baraj\u0131", "Kuruba\u015F", "\u015Eabaniye Caddesi", "\xC7atak Dura\u011F\u0131", "Eski Emniyet Kav\u015Fa\u011F\u0131", "Otogar"], "frequency": "G\xFCnde 5 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:10 - 17:05" },
  { "id": "v-live-231", "lineNo": "811", "title": "811 - Y\xDCN\xD6REN-SABANB\xDCKEN-LAT\u0130F\u0130YE", "route": "Y\xFCn\xF6ren G\xFCzergah\u0131:Zeylan Caddesi-Simeklio\u011Flu Petrol-Yukar\u0131 I\u015F\u0131kl\u0131-\u0130kiz\xE7al\u0131-Y\xFCn\xF6ren-K\xF6m\xFCr-Y\u0131lanl\u0131 Uncular G\xFCzergah\u0131:Zeylan Caddesi-Simeklio\u011Flu Petrol-A\u015Fa\u011F\u0131 I\u015F\u0131kl\u0131-Ekiciler-Uncular", "departureTimes": ["07:00 Y\xDCN\xD6REN", "09:00 LAT\u0130F\u0130YE", "11:00 LAT\u0130F\u0130YE", "13:00 LAT\u0130F\u0130YE", "15:30 Y\xDCN\xD6REN"], "returnTimes": [], "stops": ["Y\xFCn\xF6ren G\xFCzergah\u0131:Zeylan Caddesi", "Simeklio\u011Flu Petrol", "Yukar\u0131 I\u015F\u0131kl\u0131", "\u0130kiz\xE7al\u0131", "Y\xFCn\xF6ren", "K\xF6m\xFCr", "Y\u0131lanl\u0131 Uncular G\xFCzergah\u0131:Zeylan Caddesi", "Simeklio\u011Flu Petrol", "A\u015Fa\u011F\u0131 I\u015F\u0131kl\u0131", "Ekiciler", "Uncular"], "frequency": "G\xFCnde 5 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 15:30" },
  { "id": "v-live-233", "lineNo": "305-505", "title": "305-505 - KOZLUCA-SOLAHA", "route": "Dalan Caddesi - Manolya Pastanesi -Otogar-A\u015Fa\u011F\u0131 I\u015F\u0131kl\u0131-Akba\u015F-K\xFCpl\xFC-Ekiciler-Kocap\u0131nar Mahallesi-Yeti\u015Fen-P\u0131narl\u0131-Uncular Mahallesi", "departureTimes": ["07:00 KOZLUCA-\u0130NCESU", "09:00 SOLAHA", "11:00 SOLAHA", "13:00 SOLAHA", "15:00 SOLAHA", "15:30 KOZLUCA-\u0130NCESU"], "returnTimes": [], "stops": ["Dalan Caddesi", "Manolya Pastanesi", "Otogar", "A\u015Fa\u011F\u0131 I\u015F\u0131kl\u0131", "Akba\u015F", "K\xFCpl\xFC", "Ekiciler", "Kocap\u0131nar Mahallesi", "Yeti\u015Fen", "P\u0131narl\u0131", "Uncular Mahallesi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 15:30" },
  { "id": "v-live-235", "lineNo": "660", "title": "660 - GED\u0130KBULAK-DEREBEY-BA\u011EDA\u015EAN-KARAA\u011EA\xC7-ERM\u0130\u015ELER", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-Muzy Dura\u011F\u0131-Ko\xE7ibey Caddesi-H\u0131d\u0131relyez Caddesi-Erci\u015F Yolu-Otogar-Sanayi Sitesi Kav-Organize Kav.-YY\xDC Hast.Kav-F Tipi C.Evi-Alak\xF6y Kav-Ba\u011Fda\u015Fan-Karaa\u011Fa\xE7-Ermi\u015Fler-Gedikbulak-Derebey", "departureTimes": ["07:30 BA\u011EDA\u015EAN", "08:00 GED\u0130KBULAK", "15:45 OTOB\xDCS HAREKET AM\u0130RL\u0130\u011E\u0130", "16:00 MUZZY DURA\u011EI"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "Muzy Dura\u011F\u0131", "Ko\xE7ibey Caddesi", "H\u0131d\u0131relyez Caddesi", "Erci\u015F Yolu", "Otogar", "Sanayi Sitesi Kav", "Organize Kav.", "YY\xDC Hast.Kav", "F Tipi C.Evi", "Alak\xF6y Kav", "Ba\u011Fda\u015Fan", "Karaa\u011Fa\xE7", "Ermi\u015Fler", "Gedikbulak", "Derebey"], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:30 - 16:00" },
  { "id": "v-live-239", "lineNo": "ERC-1", "title": "ERC-1 - VAN ERC\u0130\u015E OTOB\xDCS HAREKET SAATLER\u0130", "route": "Van Otogar\u0131- YY\xDC Kamp\xFCs Kav\u015Fa\u011F\u0131- Muradiye \xC7ald\u0131ran Yol Ayr\u0131m\u0131- \xDCnseli-Erci\u015F \u015Eeker Fab. Sanayi Kav\u015Fa\u011F\u0131- Viar Dura\u011F\u0131- Van Yolu Cad- K\u0131\u015Fla Cad- Erci\u015F Otob\xFCs Depolama Alan\u0131", "departureTimes": ["06:10 (MAK\u0130NE \u0130KMAL GARAJI", "06:30 OTOGAR", "15:00 OTOGAR"], "returnTimes": ["08:15 ERC\u0130\u015E", "17:15 ERC\u0130\u015E"], "stops": ["Van Otogar\u0131", "YY\xDC Kamp\xFCs Kav\u015Fa\u011F\u0131", "Muradiye \xC7ald\u0131ran Yol Ayr\u0131m\u0131", "\xDCnseli", "Erci\u015F \u015Eeker Fab. Sanayi Kav\u015Fa\u011F\u0131", "Viar Dura\u011F\u0131", "Van Yolu Cad", "K\u0131\u015Fla Cad", "Erci\u015F Otob\xFCs Depolama Alan\u0131"], "frequency": "G\xFCnde 3 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:10 - 15:00" },
  { "id": "v-live-240", "lineNo": "602", "title": "602 - \xC7ELEB\u0130BA\u011EI HALK PLAJI", "route": "KI\u015ELA CADDES\u0130 \u015EENG\xDCLLER DURA\u011EI-\xC7ELEB\u0130BA\u011EI HALK PLAJI", "departureTimes": ["09:00", "11:00", "13:00", "15:00", "17:00"], "returnTimes": [], "stops": ["KI\u015ELA CADDES\u0130 \u015EENG\xDCLLER DURA\u011EI", "\xC7ELEB\u0130BA\u011EI HALK PLAJI"], "frequency": "G\xFCnde 5 sefer", "status": "Aktif", "tariff": "", "operatingHours": "09:00 - 17:00" },
  { "id": "v-live-241", "lineNo": "114-116", "title": "114-116 - G\xDCNDO\u011EAN-KIZILTA\u015E-ABALI-ALAD\xDCZ", "route": "G\xFCndo\u011Fan Mah-K\u0131z\u0131lta\u015F-Abal\u0131-Alad\xFCz-\xC7i\xE7ekli-Edremit \xC7ar\u015F\u0131-Kocaeli Park\u0131-B\xF6lge Hast.-\u0130pekyolu Cad-Eski Emniyet-Mara\u015F Cad.-Ezberciler-Milli Egemenlik Cad.Zaferler \u0130\xD6O-Depolama Alan\u0131", "departureTimes": ["06:40"], "returnTimes": ["16:30"], "stops": ["G\xFCndo\u011Fan Mah", "K\u0131z\u0131lta\u015F", "Abal\u0131", "Alad\xFCz", "\xC7i\xE7ekli", "Edremit \xC7ar\u015F\u0131", "Kocaeli Park\u0131", "B\xF6lge Hast.", "\u0130pekyolu Cad", "Eski Emniyet", "Mara\u015F Cad.", "Ezberciler", "Milli Egemenlik Cad.Zaferler \u0130\xD6O", "Depolama Alan\u0131"], "frequency": "G\xFCnde 1 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:40 - 06:40" },
  { "id": "v-live-243", "lineNo": "433", "title": "433 - BAKRA\xC7LI-YED\u0130K\u0130L\u0130SE", "route": "Otob\xFCs Hareket Amirli\u011Fi-Zaferler \u0130\u0130O-Milli Egemenlik Cad.-Hayat Hastanesi-Erek Da\u011F\u0131 Cad.-Kar\u015F\u0131yaka Be\u015Fyol-Gazi Osman Cad.-Bakra\xE7l\u0131 K\xF6y Yolu-A\u015Fa\u011F\u0131 Bakra\xE7l\u0131-Yukar\u0131 Bakra\xE7l\u0131-Bakra\xE7l\u0131 K\xF6y Yolu-Gazi Osman Cad.-Kar\u015F\u0131yaka Be\u015Fyol-Erek Da\u011F\u0131 Cad.-Van AVM-Cumhuriyet Cad.-Ezberciler \u0130\u015F Merkezi Dura\u011F\u0131-K\xFClt\xFCr Saray\u0131-Zaferler \u0130\u0130O-Otob\xFCs Hareket Amirli\u011Fi.", "departureTimes": ["09:00 MERKEZ", "11:00 MERKEZ", "13:00 MERKEZ", "15:30 MERKEZ"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Zaferler \u0130\u0130O", "Milli Egemenlik Cad.", "Hayat Hastanesi", "Erek Da\u011F\u0131 Cad.", "Kar\u015F\u0131yaka Be\u015Fyol", "Gazi Osman Cad.", "Bakra\xE7l\u0131 K\xF6y Yolu", "A\u015Fa\u011F\u0131 Bakra\xE7l\u0131", "Yukar\u0131 Bakra\xE7l\u0131", "Bakra\xE7l\u0131 K\xF6y Yolu", "Gazi Osman Cad.", "Kar\u015F\u0131yaka Be\u015Fyol", "Erek Da\u011F\u0131 Cad.", "Van AVM", "Cumhuriyet Cad.", "Ezberciler \u0130\u015F Merkezi Dura\u011F\u0131", "K\xFClt\xFCr Saray\u0131", "Zaferler \u0130\u0130O", "Otob\xFCs Hareket Amirli\u011Fi."], "frequency": "G\xFCnde 4 sefer", "status": "Aktif", "tariff": "", "operatingHours": "09:00 - 15:30" },
  { "id": "v-live-248", "lineNo": "803", "title": "803 - DE\u011E\u0130RMENARKI-KARAKO\xC7-ARITOPRAK", "route": "Otob\xFCs Hareket Amirli\u011Fi -Ters Ev-K\u0131\u015Fla Yolu-Be\u015Fyol-Muzy Dura\u011F\u0131-Ko\xE7ibey Caddesi-H\u0131d\u0131relyez Caddesi-Otogar -\xD6zalp Saray Yolu-De\u011Firmenark\u0131,Karako\xE7,Ar\u0131toprak", "departureTimes": ["15:45 OTOB\xDCS HAREKET AM\u0130RL\u0130\u011E\u0130", "16:00 MUZZY DURA\u011EI"], "returnTimes": [], "stops": ["Otob\xFCs Hareket Amirli\u011Fi", "Ters Ev", "K\u0131\u015Fla Yolu", "Be\u015Fyol", "Muzy Dura\u011F\u0131", "Ko\xE7ibey Caddesi", "H\u0131d\u0131relyez Caddesi", "Otogar", "\xD6zalp Saray Yolu", "De\u011Firmenark\u0131,Karako\xE7,Ar\u0131toprak"], "frequency": "G\xFCnde 2 sefer", "status": "Aktif", "tariff": "", "operatingHours": "15:45 - 16:00" },
  { "id": "v-live-249", "lineNo": "122", "title": "122 - EDREM\u0130T TOK\u0130-B\xDCY\xDCK\u015EEH\u0130R BELED\u0130YES\u0130", "route": "Edremit Yeni Toki-Kirac\u0131lar Toki-Eski Toki-Nur Tatar Spor Salonu-\u0130pekyolu Caddesi-B\xF6lge Hastanesi-\u0130kinisan Kav\u015Fa\u011F\u0131-\u0130kinisan Caddesi-Erekda\u011F\u0131 Caddesi-B\xFCy\xFCk\u015Fehir Belediyesi.", "departureTimes": ["06:40 EDREM\u0130T TOK\u0130"], "returnTimes": ["17:10 \u0130K\u0130N\u0130SAN CADDES\u0130"], "stops": ["Edremit Yeni Toki", "Kirac\u0131lar Toki", "Eski Toki", "Nur Tatar Spor Salonu", "\u0130pekyolu Caddesi", "B\xF6lge Hastanesi", "\u0130kinisan Kav\u015Fa\u011F\u0131", "\u0130kinisan Caddesi", "Erekda\u011F\u0131 Caddesi", "B\xFCy\xFCk\u015Fehir Belediyesi."], "frequency": "G\xFCnde 1 sefer", "status": "Aktif", "tariff": "", "operatingHours": "06:40 - 06:40" },
  { "id": "v-live-250", "lineNo": "203-102", "title": "203-102 - T-T\u0130P\u0130 CEZAEV\u0130 KAMP\xDCS\xDC-A\u015EA\u011EI TOK\u0130", "route": "T-Tipi Cezaevi G\xFCzergah\u0131:Vanyolu Caddesi-Emrah Sevli \xC7ay Bah\xE7esi Yan\u0131-Yeni Hastane-Sanayi Sitesi A\u015Fa\u011F\u0131 Toki G\xFCzergah\u0131:\xD6\u011Fretmen Evi Kav\u015Fa\u011F\u0131-Sahil Yolu-\u015Eeker Fabrikas\u0131-Kamp\xFCs Cezaevi", "departureTimes": ["07:00 A\u015EA\u011EI TOK\u0130-T-T\u0130P\u0130 CEZAEV\u0130", "09:00 A\u015EA\u011EI TOK\u0130-T-T\u0130P\u0130 CEZAEV\u0130", "11:00 A\u015EA\u011EI TOK\u0130-T-T\u0130P\u0130 CEZAEV\u0130", "13:00 A\u015EA\u011EI TOK\u0130-T-T\u0130P\u0130 CEZAEV\u0130", "15:30 A\u015EA\u011EI TOK\u0130-T-T\u0130P\u0130 CEZAEV\u0130", "17:00 A\u015EA\u011EI TOK\u0130-T-T\u0130P\u0130 CEZAEV\u0130"], "returnTimes": [], "stops": ["T", "Tipi Cezaevi G\xFCzergah\u0131:Vanyolu Caddesi", "Emrah Sevli \xC7ay Bah\xE7esi Yan\u0131", "Yeni Hastane", "Sanayi Sitesi A\u015Fa\u011F\u0131 Toki G\xFCzergah\u0131:\xD6\u011Fretmen Evi Kav\u015Fa\u011F\u0131", "Sahil Yolu", "\u015Eeker Fabrikas\u0131", "Kamp\xFCs Cezaevi"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:00" },
  { "id": "v-live-259", "lineNo": "814", "title": "814 - ULUPAM\u0130R-K\xD6YC\xDCK-OYALI-\u0130NCESU-DER\u0130MEV\u0130", "route": "Ulupamir-K\xF6yc\xFCk G\xFCzegah\u0131:Zeylan Caddesi-Simeklio\u011Flu Petrol-Yukar\u0131 I\u015F\u0131kl\u0131- \u0130\u015Fba\u015F\u0131-Ulupamir-K\xF6yc\xFCk", "departureTimes": ["07:00 ULUPAM\u0130R-K\xD6YC\xDCK", "09:00 YE\u015E\u0130LOVA", "12:00 ULUPAM\u0130R-K\xD6YC\xDCK", "14:00 OYALI-DER\u0130MEV\u0130", "15:30 ULUPAM\u0130R-K\xD6YC\xDCK"], "returnTimes": [], "stops": ["Ulupamir", "K\xF6yc\xFCk G\xFCzegah\u0131:Zeylan Caddesi", "Simeklio\u011Flu Petrol", "Yukar\u0131 I\u015F\u0131kl\u0131", "\u0130\u015Fba\u015F\u0131", "Ulupamir", "K\xF6yc\xFCk"], "frequency": "G\xFCnde 5 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 15:30" },
  { "id": "v-live-260", "lineNo": "126", "title": "126 - BE\u015EYOL-HAVAL\u0130MANI-B\xD6LGE HASTANES\u0130-MARA\u015E CADDES\u0130", "route": "OTOB\xDCS HAREKET AM\u0130RL\u0130\u011E\u0130-TERS EV-KI\u015ELA YOLU-BE\u015EYOL-SIHKE CADDES\u0130-ESK\u0130 EMN\u0130YET KAV\u015EA\u011EI-\u0130PEKYOLU CADDES\u0130-HAVAL\u0130MANI-B\xD6LGE HASTANES\u0130", "departureTimes": ["07:00 EK ARA\xC7", "08:00 (ARZALI)", "09:00 EK ARA\xC7", "10:00 (ARZALI)", "11:00 EK ARA\xC7", "12:00 (ARZALI)", "13:00 EK ARA\xC7", "14:00 (ARZALI)", "15:00 EK ARA\xC7", "16:00 (ARZALI)", "17:00 EK ARA\xC7", "18:00 (ARZALI)"], "returnTimes": ["07:00 (ARZALI)", "08:00 EK ARA\xC7", "09:00 (ARZALI)", "10:00 EK ARA\xC7", "11:00 (ARZALI)", "12:00 EK ARA\xC7", "13:00 (ARZALI)", "14:00 EK ARA\xC7", "15:00 (ARZALI)", "16:00 EK ARA\xC7", "17:00 (ARZALI)", "18:00 EK ARA\xC7"], "stops": ["OTOB\xDCS HAREKET AM\u0130RL\u0130\u011E\u0130", "TERS EV", "KI\u015ELA YOLU", "BE\u015EYOL", "SIHKE CADDES\u0130", "ESK\u0130 EMN\u0130YET KAV\u015EA\u011EI", "\u0130PEKYOLU CADDES\u0130", "HAVAL\u0130MANI", "B\xD6LGE HASTANES\u0130"], "frequency": "G\xFCnde 12 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 18:00" },
  { "id": "v-live-261", "lineNo": "ES-1", "title": "ES-1 - EDREM\u0130T YEN\u0130 TOK\u0130-K\u0130RACILAR TOK\u0130-ESK\u0130 TOK\u0130-SAH\u0130L YOLU-Y.Y.\xDC KAMP\xDCS EKSPRES HATTI", "route": "EDREM\u0130T YEN\u0130 TOK\u0130-K\u0130RACILAR TOK\u0130-ESK\u0130 TOK\u0130-NUR TATAR SPOR SALONU-KOCAEL\u0130 PARKI-UYGULAMA OTEL\u0130-SAH\u0130L YOLU-\u0130SKELE 15 TEMMUZ PARKI-Y.Y.\xDC ARA\u015ETIRMA HASTANES\u0130-KAMP\xDCS", "departureTimes": ["07:00 YEN\u0130 TOK\u0130 400 EVLER", "09:45", "11:45", "13:45", "15:45", "17:15"], "returnTimes": ["07:15", "09:45", "11:45", "13:45", "15:45", "17:15"], "stops": ["EDREM\u0130T YEN\u0130 TOK\u0130", "K\u0130RACILAR TOK\u0130", "ESK\u0130 TOK\u0130", "NUR TATAR SPOR SALONU", "KOCAEL\u0130 PARKI", "UYGULAMA OTEL\u0130", "SAH\u0130L YOLU", "\u0130SKELE 15 TEMMUZ PARKI", "Y.Y.\xDC ARA\u015ETIRMA HASTANES\u0130", "KAMP\xDCS"], "frequency": "G\xFCnde 6 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 17:15" },
  { "id": "v-live-262", "lineNo": "813", "title": "813 - S\xDCLEYMAN MEZRASI-HACIKA\u015E-N\u0130\u015EANCI-AKBA\u015E", "route": "S\xDCLEYMAN MEZRASI HACIKA\u015E G\xDCZERGAHI:ZEYLAN CADDES\u0130-MANOLYA KAV\u015EA\u011EI-S\u0130MEKL\u0130O\u011ELU PETROL-YUKARI I\u015EIKLI-S\xDCLEYMAN MEZRASI-HACIKA\u015E N\u0130\u015EANCI-AKBA\u015E G\xDCZERGAHI:ZEYLAN CADDES\u0130-MANOLYA KAV\u015EA\u011EI-S\u0130MEKL\u0130O\u011ELU PETROL-A\u015EA\u011EI I\u015EIKLI-N\u0130\u015EANCI-AKBA\u015E", "departureTimes": ["07:00 S\xDCLEYMAN MEZRASI-HACIKA\u015E", "08:20 AKBA\u015E-YOLDERE", "11:30 S\xDCLEYMAN MEZRASI-HACIKA\u015E", "14:00 AKBA\u015E-YOLDERE", "15:30 S\xDCLEYMAN MEZRASI-HACIKA\u015E"], "returnTimes": [], "stops": ["S\xDCLEYMAN MEZRASI HACIKA\u015E G\xDCZERGAHI:ZEYLAN CADDES\u0130", "MANOLYA KAV\u015EA\u011EI", "S\u0130MEKL\u0130O\u011ELU PETROL", "YUKARI I\u015EIKLI", "S\xDCLEYMAN MEZRASI", "HACIKA\u015E N\u0130\u015EANCI", "AKBA\u015E G\xDCZERGAHI:ZEYLAN CADDES\u0130", "MANOLYA KAV\u015EA\u011EI", "S\u0130MEKL\u0130O\u011ELU PETROL", "A\u015EA\u011EI I\u015EIKLI", "N\u0130\u015EANCI", "AKBA\u015E"], "frequency": "G\xFCnde 5 sefer", "status": "Aktif", "tariff": "", "operatingHours": "07:00 - 15:30" }
];

// server/busScraper.ts
var BUS_LISTING_URL = "https://van.bel.tr/Syf/Otobus-Hareket-Saatleri.html";
var BUS_FETCH_TIMEOUT_MS = 1e4;
var BUS_DETAIL_TIMEOUT_MS = 1e4;
var BUS_DETAIL_CONCURRENCY = 6;
var BUS_UA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
};
function decodeBasicHtml(text) {
  return text.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&apos;|&#0?39;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
}
function unescapeHtmlEntities(html) {
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&");
}
async function fetchVanBelTrPage(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: BUS_UA_HEADERS });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}
function parseBusListing(rawHtml) {
  const html = unescapeHtmlEntities(rawHtml);
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  const anchorRe = /<a\s+href="(?:https:\/\/van\.bel\.tr)?\/OtobusSaatDetay\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html)) !== null) {
    const detailId = match[1];
    if (seen.has(detailId)) continue;
    seen.add(detailId);
    const plain = decodeBasicHtml(match[2].replace(/<[^>]+>/g, " "));
    const strongMatch = /<strong>([\s\S]*?)<\/strong>/i.exec(match[2]);
    const lineNo = strongMatch ? decodeBasicHtml(strongMatch[1].replace(/<[^>]+>/g, " ").replace(/\s*-\s*$/, "")) : plain.split(/\s+/)[0] || `Hat ${detailId}`;
    const title = strongMatch ? decodeBasicHtml(match[2].replace(/<strong>[\s\S]*?<\/strong>/i, "").replace(/<[^>]+>/g, " ")) : plain;
    if (lineNo && title) entries.push({ detailId, lineNo, title });
  }
  return entries;
}
function parseBusDetail(rawHtml) {
  const html = unescapeHtmlEntities(rawHtml);
  const h1Match = /<h1[^>]*class="page-title"[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const title = h1Match ? decodeBasicHtml(h1Match[1].replace(/<[^>]+>/g, " ")) : "";
  const columns = (html.match(/<ul class="list-group">[\s\S]*?<\/ul>/gi) || []).map((ul) => {
    const times = [];
    const liRe = /<li class="list-group-item">([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRe.exec(ul)) !== null) {
      const text = decodeBasicHtml(liMatch[1].replace(/<[^>]+>/g, " "));
      if (/^[0-2]?\d:[0-5]\d(\s|$)/.test(text)) times.push(text);
    }
    const noteMatch = /route-note[\s\S]*?<b>([\s\S]*?)<\/b>/i.exec(ul);
    const note = noteMatch ? decodeBasicHtml(noteMatch[1].replace(/<[^>]+>/g, " ")) : "";
    return { times, note };
  });
  const route = columns[0]?.note ?? columns[1]?.note ?? "";
  return {
    title,
    route,
    departureTimes: columns[0]?.times ?? [],
    returnTimes: columns[1]?.times ?? [],
    stops: route ? route.split("-").map((s) => s.trim()).filter(Boolean) : []
  };
}
function buildLiveBusRoute(entry, detail) {
  const pureTimes = detail.departureTimes.map((t) => t.match(/^([0-2]?\d:[0-5]\d)/)?.[1]).filter((t) => Boolean(t));
  const first = pureTimes[0];
  const last = pureTimes[pureTimes.length - 1];
  return {
    id: `v-live-${entry.detailId}`,
    lineNo: entry.lineNo,
    title: detail.title || entry.title,
    route: detail.route || entry.title,
    departureTimes: detail.departureTimes,
    returnTimes: detail.returnTimes,
    stops: detail.stops,
    frequency: pureTimes.length > 0 ? `G\xFCnde ${pureTimes.length} sefer` : "Program van.bel.tr detay\u0131nda",
    status: "Aktif",
    // Tarife bilgisi van.bel.tr'de yayımlanmıyor — boş bırakılır (M31 dürüstlük).
    tariff: "",
    operatingHours: first && last ? `${first} - ${last}` : ""
  };
}
async function fetchLiveBusRoutes() {
  const listingHtml = await fetchVanBelTrPage(BUS_LISTING_URL, BUS_FETCH_TIMEOUT_MS);
  const listing = parseBusListing(listingHtml);
  if (listing.length === 0) throw new Error("van.bel.tr liste sayfas\u0131nda otob\xFCs hatt\u0131 bulunamad\u0131");
  const routes = [];
  for (let i = 0; i < listing.length; i += BUS_DETAIL_CONCURRENCY) {
    const chunk = listing.slice(i, i + BUS_DETAIL_CONCURRENCY);
    const parsed = await Promise.all(
      chunk.map(async (entry) => {
        try {
          const html = await fetchVanBelTrPage(
            `https://van.bel.tr/OtobusSaatDetay/${entry.detailId}`,
            BUS_DETAIL_TIMEOUT_MS
          );
          return buildLiveBusRoute(entry, parseBusDetail(html));
        } catch {
          return buildLiveBusRoute(entry, {
            title: entry.title,
            route: entry.title,
            departureTimes: [],
            returnTimes: [],
            stops: []
          });
        }
      })
    );
    routes.push(...parsed);
  }
  return routes;
}

// server.ts
var app = (0, import_express4.default)();
app.set("trust proxy", 1);
var PORT = Number(process.env.PORT) || 3e3;
var allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "capacitor://localhost",
  "http://localhost",
  process.env.VITE_API_URL || "https://van-rehberim-api.onrender.com"
];
app.use((0, import_cors.default)({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));
app.use(import_express4.default.json());
app.use((0, import_compression.default)());
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
var apiV1RateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  limit: Number(process.env.API_V1_RATE_LIMIT_PER_MINUTE) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "\xC7ok fazla istek g\xF6nderildi. L\xFCtfen k\u0131sa bir s\xFCre sonra tekrar deneyiniz." }
});
app.use("/api/v1", apiV1RateLimiter, publicDataRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/account", accountRouter);
var FETCH_TIMEOUT_MS = 15e3;
function fetchWithTimeout(url, init = {}, ms = FETCH_TIMEOUT_MS) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
var PHARMACIES_CACHE_TTL_MS = 60 * 60 * 1e3;
var PHARMACIES_STALE_MAX_MS = 24 * 60 * 60 * 1e3;
var pharmaciesCache = null;
app.get("/api/pharmacies", async (_req, res) => {
  if (pharmaciesCache && Date.now() - pharmaciesCache.fetchedAt < PHARMACIES_CACHE_TTL_MS) {
    return res.json(pharmaciesCache.payload);
  }
  try {
    const response = await fetchWithTimeout("https://www.vaneczaciodasi.org.tr/nobetci-eczaneler", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.vaneczaciodasi.org.tr/"
      }
    });
    if (!response.ok) {
      throw new Error(`Van Eczac\u0131 Odas\u0131 server responded with status ${response.status}`);
    }
    const html = await response.text();
    const titleMatch = html.match(/<h3 class=\"main-color\">([^<]+)<\/h3>/i);
    const rawDate = titleMatch ? titleMatch[1].trim() : "Van'da Bug\xFCn N\xF6bet\xE7i Eczaneler";
    const dutyDateMatch = rawDate.match(/([0-9]{1,2}\s+[A-ZÂİIĞÖŞÜa-zâığöşü]+\s+[0-9]{4})/);
    const dutyDate = dutyDateMatch ? dutyDateMatch[1] : "Bug\xFCn";
    const VAN_DISTRICTS = [
      "\u0130PEKYOLU",
      "TU\u015EBA",
      "EDREM\u0130T",
      "ERC\u0130\u015E",
      "BA\u015EKALE",
      "\xD6ZALP",
      "MURAD\u0130YE",
      "GEVA\u015E",
      "G\xDCRPINAR",
      "SARAY",
      "\xC7ALDIRAN",
      "\xC7ATAK",
      "BAH\xC7ESARAY"
    ];
    const BITLIS_DISTRICTS = ["AD\u0130LCEVAZ", "AHLAT", "G\xDCROYMAK", "H\u0130ZAN", "MUTK\u0130", "TATVAN", "MERKEZ"];
    const HAKKARI_DISTRICTS = ["Y\xDCKSEKOVA", "\u015EEMD\u0130NL\u0130", "DEREC\u0130K", "\xC7UKURCA"];
    const blocks = html.split('class="col-md-12 nobetci"');
    const pharmacies = [];
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      const nameMatch = b.match(/<h4[^>]*>\s*<strong>\s*([^<]+)<br\s*\/?>\s*<small>\s*([^<]+)<\/small>/i);
      const rawName = nameMatch ? nameMatch[1].trim() : "";
      const rawDistrict = nameMatch ? nameMatch[2].trim() : "";
      if (!rawName) continue;
      const phoneMatch = b.match(/href=\"tel:([0-9\s]+)\"/i);
      const phone = phoneMatch ? phoneMatch[1].trim() : "";
      const mapsMatch = b.match(/href=\"(https:\/\/maps\.google\.com\/[^\"]+)\"/i);
      const mapsUrl = mapsMatch ? mapsMatch[1] : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawName + " " + rawDistrict + " Van")}`;
      let address = "";
      const addressMatch = b.match(/fa-home[^>]*><\/i>\s*([^<]+)/i);
      if (addressMatch) {
        address = addressMatch[1].trim();
      }
      const upperDist = rawDistrict.toLocaleUpperCase("tr-TR");
      let city = "Van";
      if (VAN_DISTRICTS.includes(upperDist)) {
        city = "Van";
      } else if (BITLIS_DISTRICTS.includes(upperDist)) {
        city = "Bitlis";
      } else if (HAKKARI_DISTRICTS.includes(upperDist)) {
        city = "Hakkari";
      }
      pharmacies.push({
        id: `live-pharmacy-${i}`,
        name: rawName,
        district: rawDistrict,
        city,
        address: address || `${rawDistrict}, Van`,
        // M31: telefon ayrıştırılamadıysa boş bırak — sabit bir numara
        // uydurmak yanlış eczaneye çağrı yönlendirir. İstemci telefon
        // yoksa ARA düğmesini gizler.
        phone,
        distance: "Merkez",
        isOpen24h: true,
        dutyDate,
        mapsUrl,
        isLive: true
      });
    }
    const vanPharmacies = pharmacies.filter((p) => p.city === "Van");
    const otherPharmacies = pharmacies.filter((p) => p.city !== "Van");
    const sortedPharmacies = [...vanPharmacies, ...otherPharmacies];
    const nowStr = (/* @__PURE__ */ new Date()).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const payload = {
      success: true,
      dutyDate,
      rawTitle: rawDate,
      count: sortedPharmacies.length,
      vanCount: vanPharmacies.length,
      lastUpdated: `Bug\xFCn ${nowStr} (vaneczaciodasi.org.tr)`,
      source: "TEB 38. B\xF6lge Van Eczac\u0131 Odas\u0131",
      pharmacies: sortedPharmacies
    };
    pharmaciesCache = { payload, fetchedAt: Date.now() };
    res.json(payload);
  } catch (error) {
    console.error("Error scraping Van Eczac\u0131 Odas\u0131 duty pharmacies:", error);
    if (pharmaciesCache && Date.now() - pharmaciesCache.fetchedAt < PHARMACIES_STALE_MAX_MS) {
      return res.json({ ...pharmaciesCache.payload, stale: true, source: `${pharmaciesCache.payload.source} \u2014 ge\xE7ici olarak \xF6nbellekten` });
    }
    res.status(500).json({
      success: false,
      error: "Van Eczac\u0131 Odas\u0131 n\xF6bet\xE7i eczane verisi \xE7ekilemedi",
      details: errorMessage(error)
    });
  }
});
var PRAYER_CACHE_TTL_MS = 60 * 60 * 1e3;
var PRAYER_STALE_MAX_MS = 24 * 60 * 60 * 1e3;
var prayerCache = null;
async function fetchDiyanetTimes() {
  const now = Date.now();
  if (prayerCache && now - prayerCache.fetchedAt < PRAYER_CACHE_TTL_MS) {
    return { ...prayerCache, stale: false };
  }
  try {
    const diyanetUrl = "https://namazvakitleri.diyanet.gov.tr/tr-TR/9930/van-icin-namaz-vakti";
    const response = await fetchWithTimeout(diyanetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    if (!response.ok) {
      throw new Error(`Diyanet server status ${response.status}`);
    }
    const html = await response.text();
    const unescapeHtml = (str) => str.replace(/&#39;/g, "'").replace(/&#231;/g, "\xE7").replace(/&#214;/g, "\xD6").replace(/&#246;/g, "\xF6").replace(/&#252;/g, "\xFC").replace(/&#199;/g, "\xC7").replace(/&quot;/g, '"');
    const cleanHtml = unescapeHtml(html);
    const imsakMatch = cleanHtml.match(/İmsak\s+([0-9]{2}:[0-9]{2})/i);
    const gunesMatch = cleanHtml.match(/Güneş\s+([0-9]{2}:[0-9]{2})/i);
    const ogleMatch = cleanHtml.match(/Öğle\s+([0-9]{2}:[0-9]{2})/i);
    const ikindiMatch = cleanHtml.match(/İkindi\s+([0-9]{2}:[0-9]{2})/i);
    const aksamMatch = cleanHtml.match(/Akşam\s+([0-9]{2}:[0-9]{2})/i);
    const yatsiMatch = cleanHtml.match(/Yatsı\s+([0-9]{2}:[0-9]{2})/i);
    if (!imsakMatch || !gunesMatch || !ogleMatch || !ikindiMatch || !aksamMatch || !yatsiMatch) {
      throw new Error("Diyanet sayfa yap\u0131s\u0131 de\u011Fi\u015Fti: namaz vakitleri eksik ayr\u0131\u015Ft\u0131r\u0131ld\u0131");
    }
    const times = {
      imsak: imsakMatch[1],
      sabah: gunesMatch[1],
      // Güneş
      ogle: ogleMatch[1],
      ikindi: ikindiMatch[1],
      aksam: aksamMatch[1],
      yatsi: yatsiMatch[1]
    };
    const dateMatch = cleanHtml.match(/([0-9]{1,2}\s+[A-ZÂİIĞÖŞÜa-zâığöşü]+\s+[0-9]{4})/);
    const dateStr = dateMatch ? dateMatch[1] : (/* @__PURE__ */ new Date()).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    prayerCache = { times, dateStr, fetchedAt: now };
    return { times, dateStr, fetchedAt: now, stale: false };
  } catch (err) {
    if (prayerCache && now - prayerCache.fetchedAt < PRAYER_STALE_MAX_MS) {
      console.warn("[prayer-times] Diyanet eri\u015Filemedi, bayat \xF6nbellek kullan\u0131l\u0131yor:", errorMessage(err));
      return { ...prayerCache, stale: true };
    }
    throw err;
  }
}
app.get("/api/prayer-times", async (_req, res) => {
  try {
    const { times, dateStr, stale } = await fetchDiyanetTimes();
    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };
    const now = /* @__PURE__ */ new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const imsakM = toMinutes(times.imsak);
    const gunesM = toMinutes(times.sabah);
    const ogleM = toMinutes(times.ogle);
    const ikindiM = toMinutes(times.ikindi);
    const aksamM = toMinutes(times.aksam);
    const yatsiM = toMinutes(times.yatsi);
    let activeKey = "yatsi";
    let activeTitle = "Yats\u0131 Vakti";
    let nextTitle = "\u0130msak";
    let nextMinutes = 24 * 60 - nowMinutes + imsakM;
    if (nowMinutes >= imsakM && nowMinutes < gunesM) {
      activeKey = "imsak";
      activeTitle = "\u0130msak (Sabah Vakti)";
      nextTitle = "G\xFCne\u015F";
      nextMinutes = gunesM - nowMinutes;
    } else if (nowMinutes >= gunesM && nowMinutes < ogleM) {
      activeKey = "sabah";
      activeTitle = "G\xFCne\u015F (Ku\u015Fluk Vakti)";
      nextTitle = "\xD6\u011Fle";
      nextMinutes = ogleM - nowMinutes;
    } else if (nowMinutes >= ogleM && nowMinutes < ikindiM) {
      activeKey = "ogle";
      activeTitle = "\xD6\u011Fle Vakti";
      nextTitle = "\u0130kindi";
      nextMinutes = ikindiM - nowMinutes;
    } else if (nowMinutes >= ikindiM && nowMinutes < aksamM) {
      activeKey = "ikindi";
      activeTitle = "\u0130kindi Vakti";
      nextTitle = "Ak\u015Fam";
      nextMinutes = aksamM - nowMinutes;
    } else if (nowMinutes >= aksamM && nowMinutes < yatsiM) {
      activeKey = "aksam";
      activeTitle = "Ak\u015Fam Vakti";
      nextTitle = "Yats\u0131";
      nextMinutes = yatsiM - nowMinutes;
    } else {
      activeKey = "yatsi";
      activeTitle = "Yats\u0131 Vakti";
      nextTitle = "\u0130msak";
      if (nowMinutes >= yatsiM) {
        nextMinutes = 24 * 60 - nowMinutes + imsakM;
      } else {
        nextMinutes = imsakM - nowMinutes;
      }
    }
    const hoursLeft = Math.floor(nextMinutes / 60);
    const minsLeft = nextMinutes % 60;
    let remainingText = "";
    if (hoursLeft > 0) {
      remainingText = `${hoursLeft} sa ${minsLeft} dk kald\u0131`;
    } else {
      remainingText = `${minsLeft} dk kald\u0131`;
    }
    const nowStr = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    res.json({
      success: true,
      city: "Van (Diyanet)",
      date: dateStr,
      times,
      activeKey,
      activeTitle,
      nextPrayer: nextTitle,
      remainingText,
      remainingMinutes: nextMinutes,
      lastUpdated: `Bug\xFCn ${nowStr} (namazvakitleri.diyanet.gov.tr)`,
      source: stale ? "Diyanet \u0130\u015Fleri Ba\u015Fkanl\u0131\u011F\u0131 \u2014 ge\xE7ici olarak \xF6nbellekten" : "Diyanet \u0130\u015Fleri Ba\u015Fkanl\u0131\u011F\u0131",
      // M31: bayat önbellek yanıtında isLive artık dürüstçe false
      isLive: !stale,
      stale
    });
  } catch (error) {
    console.error("Error fetching Diyanet prayer times:", error);
    res.status(500).json({
      success: false,
      error: "Diyanet ezan vakti verileri al\u0131namad\u0131",
      details: errorMessage(error)
    });
  }
});
var CURRENCIES_CACHE_TTL_MS = 10 * 60 * 1e3;
var CURRENCIES_STALE_MAX_MS = 2 * 60 * 60 * 1e3;
var currenciesCache = null;
app.get("/api/currencies", async (_req, res) => {
  if (currenciesCache && Date.now() - currenciesCache.fetchedAt < CURRENCIES_CACHE_TTL_MS) {
    return res.json(currenciesCache.payload);
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1e4);
    const response = await fetch("https://www.doviz.com/", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`doviz.com status ${response.status}`);
    }
    const html = await response.text();
    const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const tableItems = [];
    rowMatches.forEach((tr) => {
      const keyMatch = tr.match(/data-socket-key="([^"]+)"/);
      if (!keyMatch) return;
      const key = keyMatch[1];
      const nameMatch = tr.match(/<a[^>]*>\s*([\s\S]*?)\s*<\/a>/i);
      const rawName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").trim() : key;
      const valMatch = tr.match(/data-socket-attr="s"[^>]*>\s*([^<]+)\s*<\/td>/i) || tr.match(/data-socket-attr="s"[^>]*>\s*([^<]+)/i);
      const changeMatch = tr.match(/data-socket-attr="c"[^>]*>\s*([^<]+)\s*<\/td>/i) || tr.match(/data-socket-attr="c"[^>]*>\s*([^<]+)/i);
      let status = "neutral";
      if (tr.includes("color-up") || tr.includes("status up")) status = "up";
      if (tr.includes("color-down") || tr.includes("status down")) status = "down";
      const value = valMatch ? valMatch[1].trim() : "-";
      let change = changeMatch ? changeMatch[1].trim() : "%0,00";
      if (!change.startsWith("%")) change = "%" + change;
      tableItems.push({ key, name: rawName, value, change, status });
    });
    const parseKeyHero = (key, defaultName) => {
      const valRegex = new RegExp('<span[^>]*data-socket-key="' + key + '"[^>]*data-socket-attr="s"[^>]*>\\s*([^<]+)\\s*<\\/span', "i");
      const valAlt = new RegExp('<span[^>]*data-socket-attr="s"[^>]*data-socket-key="' + key + '"[^>]*>\\s*([^<]+)\\s*<\\/span', "i");
      const vm = html.match(valRegex) || html.match(valAlt);
      const changeRegex = new RegExp('<div[^>]*data-socket-key="' + key + '"[^>]*data-socket-attr="c"[^>]*>\\s*(%?[+\\-]?[0-9.,]+%?)\\s*<\\/div', "i");
      const changeAlt = new RegExp('<div[^>]*data-socket-attr="c"[^>]*data-socket-key="' + key + '"[^>]*>\\s*(%?[+\\-]?[0-9.,]+%?)\\s*<\\/div', "i");
      const cm = html.match(changeRegex) || html.match(changeAlt);
      const statusRegex = new RegExp('class="[^"]*status\\s+(up|down|neutral)[^"]*"[^>]*data-socket-key="' + key + '"', "i");
      const statusAlt = new RegExp('data-socket-key="' + key + '"[^>]*class="[^"]*status\\s+(up|down|neutral)[^"]*"', "i");
      const sm = html.match(statusRegex) || html.match(statusAlt);
      let status = "neutral";
      if (sm) status = sm[1];
      return {
        key,
        name: defaultName,
        value: vm ? vm[1].trim() : "-",
        change: cm ? cm[1].trim().startsWith("%") ? cm[1].trim() : "%" + cm[1].trim() : "%0,00",
        status
      };
    };
    const heroKeys = [
      { key: "USD", name: "Dolar", code: "DOLAR" },
      { key: "EUR", name: "Euro", code: "EURO" },
      { key: "GBP", name: "Sterlin", code: "STERL\u0130N" },
      { key: "gram-altin", name: "Gram Alt\u0131n", code: "ALTIN" },
      { key: "ceyrek-altin", name: "\xC7eyrek Alt\u0131n", code: "\xC7.ALTIN" },
      { key: "gumus", name: "G\xFCm\xFC\u015F", code: "G\xDCM\xDC\u015E" },
      { key: "XU100", name: "BIST 100", code: "BIST 100" },
      { key: "BRENT", name: "Brent Petrol", code: "PETROL" },
      { key: "d-bitcoin", name: "Bitcoin", code: "BTC" }
    ];
    const heroRates = heroKeys.map((h) => {
      const inTable = tableItems.find((t) => t.key === h.key && t.value !== "-");
      if (inTable) {
        return {
          code: h.code,
          name: h.name,
          value: inTable.value,
          change: inTable.change,
          isUp: inTable.status === "up",
          status: inTable.status,
          key: h.key
        };
      }
      const parsed = parseKeyHero(h.key, h.name);
      return {
        code: h.code,
        name: h.name,
        value: parsed.value,
        change: parsed.change,
        isUp: parsed.status === "up",
        status: parsed.status,
        key: h.key
      };
    });
    const now = /* @__PURE__ */ new Date();
    const nowStr = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const payload = {
      success: true,
      heroRates,
      tableItems,
      lastUpdated: `Bug\xFCn ${nowStr} (doviz.com)`,
      source: "doviz.com (Canl\u0131 Piyasalar)",
      isLive: true
    };
    currenciesCache = { payload, fetchedAt: Date.now() };
    return res.json(payload);
  } catch (error) {
    console.error("Error fetching doviz.com rates:", error);
    if (currenciesCache && Date.now() - currenciesCache.fetchedAt <= CURRENCIES_STALE_MAX_MS) {
      return res.json({
        ...currenciesCache.payload,
        stale: true,
        source: `${currenciesCache.payload.source} \u2014 ge\xE7ici olarak \xF6nbellekten`
      });
    }
    res.status(500).json({
      success: false,
      error: "doviz.com canl\u0131 kurlar \xE7ekilemedi",
      details: errorMessage(error)
    });
  }
});
var BUS_CACHE_TTL_MS = 60 * 60 * 1e3;
var BUS_STALE_MAX_MS = 24 * 60 * 60 * 1e3;
var busCache = null;
var busRefreshInProgress = false;
function refreshBusCacheInBackground() {
  if (busRefreshInProgress) return;
  busRefreshInProgress = true;
  void (async () => {
    try {
      const routes = await fetchLiveBusRoutes();
      const withTimes = routes.filter((r) => r.departureTimes.length > 0);
      console.log(`[bus] van.bel.tr yenileme: ${routes.length} hat (${withTimes.length} saatli)`);
      if (withTimes.length >= 10) {
        busCache = {
          payload: {
            success: true,
            routes,
            lastUpdated: `van.bel.tr Canl\u0131 (${(/* @__PURE__ */ new Date()).toLocaleString("tr-TR", {
              dateStyle: "short",
              timeStyle: "short"
            })})`,
            source: "van.bel.tr (VAN BELVAN Ula\u015F\u0131m Dairesi)",
            isLive: true
          },
          fetchedAt: Date.now()
        };
      }
    } catch (error) {
      console.warn("[bus] van.bel.tr canl\u0131 veri al\u0131namad\u0131:", errorMessage(error));
    } finally {
      busRefreshInProgress = false;
    }
  })();
}
app.get("/api/bus-schedules", (_req, res) => {
  if (busCache && Date.now() - busCache.fetchedAt < BUS_CACHE_TTL_MS) {
    return res.json(busCache.payload);
  }
  refreshBusCacheInBackground();
  if (busCache && Date.now() - busCache.fetchedAt < BUS_STALE_MAX_MS) {
    return res.json({ ...busCache.payload, stale: true, source: `${busCache.payload.source} \u2014 ge\xE7ici olarak \xF6nbellekten` });
  }
  res.json({
    success: true,
    routes: BUS_SNAPSHOT_ROUTES,
    lastUpdated: `van.bel.tr anl\u0131k g\xF6r\xFCnt\xFC (${BUS_SNAPSHOT_LAST_UPDATED})`,
    source: "van.bel.tr (VAN BELVAN Ula\u015F\u0131m Dairesi) \u2014 yerel kopya",
    isLive: false
  });
});
var NEWS_CACHE_TTL_MS = 10 * 60 * 1e3;
var NEWS_STALE_MAX_MS = 2 * 60 * 60 * 1e3;
var newsCache = null;
app.get("/api/news", async (_req, res) => {
  const rssChannels = [
    { name: "Wan Haber", domain: "wanhaber.com", baseUrl: "https://www.wanhaber.com", rssUrl: "https://www.wanhaber.com/rss" },
    { name: "Van Olay", domain: "vanolay.com", baseUrl: "https://www.vanolay.com", rssUrl: "https://www.vanolay.com/rss" },
    { name: "Van Havadis", domain: "vanhavadis.com", baseUrl: "https://www.vanhavadis.com", rssUrl: "https://www.vanhavadis.com/rss" }
  ];
  if (newsCache && Date.now() - newsCache.fetchedAt < NEWS_CACHE_TTL_MS) {
    return res.json(newsCache.payload);
  }
  const todayStr = (/* @__PURE__ */ new Date()).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  try {
    const rssPromises = rssChannels.map(async (channel) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const res2 = await fetch(channel.rssUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/rss+xml, application/xml, text/xml"
          }
        });
        clearTimeout(timeoutId);
        if (res2.ok) {
          const xmlText = await res2.text();
          const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];
          const items = [];
          for (let i = 0; i < Math.min(itemMatches.length, 15); i++) {
            const itemXml = itemMatches[i];
            const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
            const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
            const imgMatch = itemXml.match(/url="([^"]+\.(?:jpg|png|jpeg|webp))"/i) || itemXml.match(/src="([^"]+\.(?:jpg|png|jpeg|webp))"/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
            const link = linkMatch ? linkMatch[1].trim() : channel.baseUrl;
            const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 150) : title;
            const image = imgMatch ? imgMatch[1].replace(/^http:\/\//i, "https://") : "";
            let date = todayStr;
            let time = (/* @__PURE__ */ new Date()).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
            if (pubDateMatch) {
              const parsed = new Date(pubDateMatch[1].trim());
              if (!isNaN(parsed.getTime())) {
                date = parsed.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
                time = parsed.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
              }
            }
            if (title && title.length > 5) {
              items.push({
                id: `rss-${channel.domain}-${i}-${Date.now()}`,
                title,
                category: `${channel.name} Canl\u0131`,
                image,
                summary: desc.length > 120 ? desc + "..." : desc,
                content: desc + " Devam\u0131 i\xE7in kayna\u011F\u0131 ziyaret ediniz.",
                date,
                time,
                source: channel.name,
                sourceUrl: link
              });
            }
          }
          return items;
        }
      } catch {
      }
      return [];
    });
    const results = await Promise.allSettled(rssPromises);
    const fetchedNews = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        fetchedNews.push(...r.value);
      }
    });
    let finalNews = fetchedNews;
    const limitParam = Number(_req.query.limit);
    if (!isNaN(limitParam) && limitParam > 0) {
      finalNews = finalNews.slice(0, limitParam);
    } else {
      finalNews = finalNews.slice(0, 30);
    }
    if (finalNews.length > 0) {
      const payload = {
        success: true,
        count: finalNews.length,
        lastUpdated: `G\xFCncel ${(/* @__PURE__ */ new Date()).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`,
        source: "Wan Haber, Van Olay, Van Havadis (Canl\u0131 RSS)",
        channelsCount: rssChannels.length,
        news: finalNews
      };
      newsCache = { payload, fetchedAt: Date.now() };
      return res.json(payload);
    }
    if (newsCache && Date.now() - newsCache.fetchedAt <= NEWS_STALE_MAX_MS) {
      return res.json({
        ...newsCache.payload,
        stale: true,
        source: `${newsCache.payload.source} \u2014 ge\xE7ici olarak \xF6nbellekten`
      });
    }
  } catch (err) {
    console.warn("Error fetching RSS news:", err);
    if (newsCache && Date.now() - newsCache.fetchedAt <= NEWS_STALE_MAX_MS) {
      return res.json({
        ...newsCache.payload,
        stale: true,
        source: `${newsCache.payload.source} \u2014 ge\xE7ici olarak \xF6nbellekten`
      });
    }
  }
  res.status(503).json({
    success: false,
    count: 0,
    error: "Canl\u0131 haber kaynaklar\u0131na \u015Fu anda ula\u015F\u0131lam\u0131yor. L\xFCtfen daha sonra tekrar deneyiniz.",
    channelsCount: rssChannels.length
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express4.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
