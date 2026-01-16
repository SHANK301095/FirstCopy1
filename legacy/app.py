from __future__ import annotations

import json
import os
import sqlite3
import time
from datetime import datetime
from functools import wraps
from typing import Any, Callable, Dict, List, Tuple

from flask import Flask, abort, g, redirect, render_template, request, url_for

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "seasonville.db")
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 120

RATE_LIMIT_BUCKET: Dict[str, List[float]] = {}

PRODUCT_LINES = [
    "Signature Hampers",
    "Festive Foods",
    "Puja Essentials",
    "Home Glow & Decor",
    "Care Line",
    "Kids Festive",
    "Corporate Gifting",
]

FESTIVAL_CALENDAR = [
    (1, "Makar Sankranti", "North/West", "Harvest celebration with sesame treats."),
    (1, "Lohri", "North", "Bonfires, folk songs, and winter gifting."),
    (1, "Pongal", "South", "Puja essentials and traditional sweets."),
    (2, "Vasant Panchami", "Pan-India", "Bright yellow essentials and puja kits."),
    (2, "Mahashivratri", "Pan-India", "Rudraksha kits and fasting snacks."),
    (3, "Holi", "Pan-India", "Skin-safe color kits and gujiya hampers."),
    (3, "Chaitra Navratri", "North", "Durga puja kits and fasting bites."),
    (4, "Ram Navami", "North", "Puja thalis and prasad mixes."),
    (4, "Hanuman Jayanti", "Pan-India", "Hanuman chalisa kits and prasad."),
    (5, "Akshaya Tritiya", "Pan-India", "Gold-toned gift hampers and diya sets."),
    (6, "Summer Travel", "Pan-India", "Travel minis and hydration packs."),
    (7, "Monsoon", "Pan-India", "Comfort snacks and cozy decor."),
    (7, "Shravan", "West", "Fasting mixes and puja essentials."),
    (8, "Rakhi", "Pan-India", "Rakhi hampers and sibling gifting."),
    (8, "Janmashtami", "Pan-India", "Matki decor and sweets."),
    (8, "Independence Day", "Pan-India", "Tricolor decor and gifting."),
    (9, "Ganesh Chaturthi", "West", "Modak mixes and decor."),
    (9, "Onam", "South", "Pookalam kits and feast sets."),
    (10, "Navratri", "Pan-India", "Fasting food kits and garba decor."),
    (10, "Durga Puja", "East", "Puja essentials and prasad."),
    (10, "Dussehra", "Pan-India", "Ravan dahan decor and gifts."),
    (11, "Diwali", "Pan-India", "Premium hampers, diyas, sweets."),
    (11, "Bhai Dooj", "North", "Brother-sister gifting kits."),
    (11, "Chhath", "East", "Puja kits and prasad mixes."),
    (11, "Wedding Peak", "Pan-India", "Premium hampers and decor."),
    (12, "Christmas", "Pan-India", "Warm treats and decor."),
    (12, "New Year", "Pan-India", "Party kits and gift sets."),
    (12, "Year-end Corporate", "Pan-India", "Corporate gifting collections."),
]

BACKLOG_CATEGORIES = [
    "Discovery & Navigation",
    "Product Page & Merchandising",
    "Cart, Checkout & Payments",
    "Shipping, Delivery & Returns",
    "Accounts, Loyalty & Community",
    "Content, SEO & Education",
    "Private Label Ops, QC & Inventory",
    "Admin, Analytics & Experimentation",
    "Security, Performance & Reliability",
]


def create_app() -> Flask:
    app = Flask(__name__)

    @app.before_request
    def ensure_db() -> None:
        if not os.path.exists(DATABASE_PATH):
            init_db()
            seed_data()

    @app.context_processor
    def inject_search_suggestions() -> Dict[str, Any]:
        try:
            db = get_db()
            suggestions = db.execute("SELECT name FROM products LIMIT 6").fetchall()
            return {"search_suggestions": [row["name"] for row in suggestions]}
        except sqlite3.Error:
            return {"search_suggestions": []}

    @app.teardown_appcontext
    def close_db(exception: Exception | None) -> None:
        db = g.pop("db", None)
        if db is not None:
            db.close()

    @app.after_request
    def add_cache_headers(response):  # type: ignore[no-untyped-def]
        if request.path.startswith("/static/"):
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response

    def get_db() -> sqlite3.Connection:
        if "db" not in g:
            conn = sqlite3.connect(DATABASE_PATH)
            conn.row_factory = sqlite3.Row
            g.db = conn
        return g.db

    def rate_limited() -> bool:
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "")
        now = time.time()
        window_start = now - RATE_LIMIT_WINDOW
        timestamps = RATE_LIMIT_BUCKET.get(ip, [])
        timestamps = [ts for ts in timestamps if ts > window_start]
        if len(timestamps) >= RATE_LIMIT_MAX:
            RATE_LIMIT_BUCKET[ip] = timestamps
            return True
        timestamps.append(now)
        RATE_LIMIT_BUCKET[ip] = timestamps
        return False

    def rate_limit_guard(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            if rate_limited():
                abort(429)
            return func(*args, **kwargs)

        return wrapper

    def log_event(event_name: str, payload: Dict[str, Any]) -> None:
        db = get_db()
        db.execute(
            "INSERT INTO analytics_events (event_name, payload_json, created_at) VALUES (?, ?, ?)",
            (event_name, json.dumps(payload), datetime.utcnow().isoformat()),
        )
        db.commit()

    def log_admin_action(action: str, target: str) -> None:
        db = get_db()
        db.execute(
            "INSERT INTO admin_audit_logs (admin_user, action, target, created_at) VALUES (?, ?, ?, ?)",
            ("demo-admin", action, target, datetime.utcnow().isoformat()),
        )
        db.commit()

    def fetch_all(query: str, params: Tuple[Any, ...] = ()) -> List[sqlite3.Row]:
        db = get_db()
        return db.execute(query, params).fetchall()

    def fetch_one(query: str, params: Tuple[Any, ...] = ()) -> sqlite3.Row | None:
        db = get_db()
        return db.execute(query, params).fetchone()

    def write(query: str, params: Tuple[Any, ...]) -> int:
        db = get_db()
        cur = db.execute(query, params)
        db.commit()
        return cur.lastrowid

    def fetch_serviceability(pincode: str) -> sqlite3.Row | None:
        return fetch_one("SELECT * FROM serviceability WHERE pincode = ?", (pincode,))

    def is_valid_pincode(pincode: str) -> bool:
        return pincode.isdigit() and len(pincode) == 6

    def cod_allowed(product_ids: List[int], pincode: str) -> Tuple[bool, str]:
        service = fetch_serviceability(pincode)
        if not service:
            return False, "We do not currently deliver to this pincode."
        if not service["cod_allowed"]:
            return False, "COD is not available in this area."
        risky = fetch_one(
            "SELECT COUNT(*) as cnt FROM products WHERE id IN ({seq}) AND product_line = ?".format(
                seq=",".join("?" for _ in product_ids)
            ),
            tuple(product_ids) + ("Festive Foods",),
        )
        if risky and risky["cnt"] > 0:
            return False, "COD is disabled for food items in this pincode."
        return True, "COD available."

    def get_cart() -> sqlite3.Row:
        cart = fetch_one("SELECT * FROM carts WHERE id = 1")
        if cart:
            return cart
        cart_id = write(
            "INSERT INTO carts (id, user_id, status, created_at) VALUES (1, 1, 'open', ?)",
            (datetime.utcnow().isoformat(),),
        )
        return fetch_one("SELECT * FROM carts WHERE id = ?", (cart_id,))

    def calculate_cart_items(cart_id: int) -> Tuple[List[sqlite3.Row], float]:
        items = fetch_all(
            """
            SELECT cart_items.*, products.name as product_name, products.product_line
            FROM cart_items
            JOIN products ON products.id = cart_items.product_id
            WHERE cart_items.cart_id = ?
            """,
            (cart_id,),
        )
        total = sum(item["qty"] * item["price_each"] for item in items)
        return items, total

    def packaging_rules(product_line: str) -> List[str]:
        if product_line == "Festive Foods":
            return [
                "Tamper-evident seal + batch label",
                "Food-safe inserts + moisture barrier",
                "Fragile padding for jars",
            ]
        if product_line == "Home Glow & Decor":
            return ["Fragile handling label", "Protective sleeves + foam inserts"]
        if product_line == "Puja Essentials":
            return ["Secure thali placement", "Ritual insert card included"]
        return ["Base box + festival sleeve", "Story card + how-to insert"]

    @app.route("/")
    @rate_limit_guard
    def home() -> str:
        festivals = fetch_all("SELECT * FROM festival_calendar ORDER BY month_index, name")
        bundles = fetch_all("SELECT * FROM bundles WHERE is_active = 1 LIMIT 3")
        promise = "Delivery in 2-4 days in metro cities."
        log_event("page_view", {"page": "home"})
        return render_template(
            "home.html",
            festivals=festivals,
            bundles=bundles,
            promise=promise,
        )

    @app.route("/festivals")
    @rate_limit_guard
    def festivals_hub() -> str:
        festivals = fetch_all("SELECT * FROM festival_calendar ORDER BY month_index, name")
        log_event("page_view", {"page": "festivals_hub"})
        return render_template("festivals.html", festivals=festivals)

    @app.route("/festival/<slug>")
    @rate_limit_guard
    def festival_detail(slug: str) -> str:
        festival = fetch_one("SELECT * FROM festival_calendar WHERE lower(name) = ?", (slug.replace("-", " "),))
        if not festival:
            abort(404)
        products = fetch_all(
            "SELECT * FROM products WHERE festival_tags LIKE ? LIMIT 8",
            (f"%{festival['name']}%",),
        )
        bundles = fetch_all("SELECT * FROM bundles WHERE items_json LIKE ?", (f"%{festival['name']}%",))
        return render_template("festival_detail.html", festival=festival, products=products, bundles=bundles)

    @app.route("/collections")
    @rate_limit_guard
    def collections() -> str:
        collections_data = [
            {"title": line, "slug": line.lower().replace(" ", "-")} for line in PRODUCT_LINES
        ]
        return render_template("collections.html", collections=collections_data)

    @app.route("/search")
    @rate_limit_guard
    def search() -> str:
        query = request.args.get("q", "").strip()
        results: List[sqlite3.Row] = []
        if query:
            results = fetch_all(
                "SELECT * FROM products WHERE name LIKE ? OR description LIKE ?",
                (f"%{query}%", f"%{query}%"),
            )
        suggestions = fetch_all("SELECT * FROM products ORDER BY price DESC LIMIT 4")
        return render_template(
            "search.html",
            query=query,
            results=results,
            suggestions=suggestions,
        )

    @app.route("/product/<int:product_id>")
    @rate_limit_guard
    def product_detail(product_id: int) -> str:
        product = fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))
        if not product:
            abort(404)
        variants = fetch_all("SELECT * FROM product_variants WHERE product_id = ?", (product_id,))
        reviews = fetch_all("SELECT * FROM reviews WHERE product_id = ? AND status = 'approved'", (product_id,))
        return render_template(
            "product.html",
            product=product,
            variants=variants,
            reviews=reviews,
            packaging_rules=packaging_rules(product["product_line"]),
        )

    @app.route("/bundle-builder", methods=["GET", "POST"])
    @rate_limit_guard
    def bundle_builder() -> str:
        products = fetch_all("SELECT * FROM products WHERE is_active = 1 LIMIT 12")
        bundle_preview = None
        if request.method == "POST":
            selected = request.form.getlist("product")
            if len(selected) >= 3:
                selected_products = fetch_all(
                    "SELECT * FROM products WHERE id IN ({seq})".format(seq=",".join("?" for _ in selected)),
                    tuple(selected),
                )
                total = sum(product["price"] for product in selected_products)
                bundle_preview = {
                    "items": selected_products,
                    "total": total,
                    "message": "Your bundle qualifies for a premium gift box.",
                }
            else:
                bundle_preview = {"error": "Pick at least 3 items to build a bundle."}
        return render_template("bundle_builder.html", products=products, bundle_preview=bundle_preview)

    @app.route("/cart")
    @rate_limit_guard
    def cart() -> str:
        cart_row = get_cart()
        items, total = calculate_cart_items(cart_row["id"])
        return render_template("cart.html", items=items, total=total)

    @app.route("/cart/add/<int:product_id>", methods=["POST"])
    @rate_limit_guard
    def cart_add(product_id: int) -> str:
        product = fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))
        if not product:
            abort(404)
        cart_row = get_cart()
        existing = fetch_one(
            "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?",
            (cart_row["id"], product_id),
        )
        if existing:
            write("UPDATE cart_items SET qty = qty + 1 WHERE id = ?", (existing["id"],))
        else:
            write(
                "INSERT INTO cart_items (cart_id, product_id, qty, price_each) VALUES (?, ?, ?, ?)",
                (cart_row["id"], product_id, 1, product["price"]),
            )
        log_event("cart_add", {"product_id": product_id})
        return redirect(url_for("cart"))

    @app.route("/checkout", methods=["GET", "POST"])
    @rate_limit_guard
    def checkout() -> str:
        cart_row = get_cart()
        items, total = calculate_cart_items(cart_row["id"])
        serviceability = None
        cod_message = None
        if request.method == "POST":
            pincode = request.form.get("pincode", "").strip()
            delivery_date = request.form.get("delivery_date", "")
            gift_message = request.form.get("gift_message", "")
            gift_wrap = 1 if request.form.get("gift_wrap") == "on" else 0
            payment_method = request.form.get("payment_method", "UPI")
            if not is_valid_pincode(pincode):
                return render_template(
                    "checkout.html",
                    items=items,
                    total=total,
                    error="Enter a valid 6-digit pincode.",
                    serviceability=serviceability,
                    cod_message=cod_message,
                )
            serviceability = fetch_serviceability(pincode)
            if not serviceability or not items:
                return render_template(
                    "checkout.html",
                    items=items,
                    total=total,
                    error="We cannot place the order with the current details.",
                    serviceability=serviceability,
                    cod_message=cod_message,
                )
            product_ids = [item["product_id"] for item in items]
            cod_ok, cod_message = cod_allowed(product_ids, pincode)
            if payment_method == "COD" and not cod_ok:
                return render_template(
                    "checkout.html",
                    items=items,
                    total=total,
                    error=cod_message,
                    serviceability=serviceability,
                    cod_message=cod_message,
                )
            order_id = write(
                """
                INSERT INTO orders (user_id, status, total_amount, delivery_date, gift_message, gift_wrap, created_at)
                VALUES (1, 'placed', ?, ?, ?, ?, ?)
                """,
                (total, delivery_date, gift_message, gift_wrap, datetime.utcnow().isoformat()),
            )
            for item in items:
                write(
                    "INSERT INTO order_items (order_id, product_id, qty, price_each) VALUES (?, ?, ?, ?)",
                    (order_id, item["product_id"], item["qty"], item["price_each"]),
                )
            payment_needs_setup = 1 if payment_method == "UPI" else 0
            write(
                """
                INSERT INTO payments (order_id, status, method, gateway_ref, needs_setup)
                VALUES (?, 'pending', ?, 'NEEDS_SETUP', ?)
                """,
                (order_id, payment_method, payment_needs_setup),
            )
            write(
                """
                INSERT INTO shipments (order_id, status, courier, tracking_no, needs_setup)
                VALUES (?, 'processing', 'Needs Setup', 'Needs Setup', 1)
                """,
                (order_id,),
            )
            write("DELETE FROM cart_items WHERE cart_id = ?", (cart_row["id"],))
            log_event("order_placed", {"order_id": order_id})
            return redirect(url_for("order_success", order_id=order_id))
        if request.args.get("pincode"):
            serviceability = fetch_serviceability(request.args.get("pincode", ""))
        if items:
            product_ids = [item["product_id"] for item in items]
            cod_ok, cod_message = cod_allowed(product_ids, request.args.get("pincode", "110001"))
        return render_template(
            "checkout.html",
            items=items,
            total=total,
            serviceability=serviceability,
            cod_message=cod_message,
        )

    @app.route("/order/<int:order_id>")
    @rate_limit_guard
    def order_success(order_id: int) -> str:
        order = fetch_one("SELECT * FROM orders WHERE id = ?", (order_id,))
        if not order:
            abort(404)
        shipment = fetch_one("SELECT * FROM shipments WHERE order_id = ?", (order_id,))
        return render_template("order_success.html", order=order, shipment=shipment)

    @app.route("/returns/request", methods=["GET", "POST"])
    @rate_limit_guard
    def request_return() -> str:
        order_id = request.args.get("order_id", type=int)
        if not order_id:
            abort(404)
        order = fetch_one("SELECT * FROM orders WHERE id = ?", (order_id,))
        if not order:
            abort(404)
        items = fetch_all(
            """
            SELECT order_items.*, products.name as product_name, products.product_line
            FROM order_items
            JOIN products ON products.id = order_items.product_id
            WHERE order_items.order_id = ?
            """,
            (order_id,),
        )
        error = None
        success = None
        if request.method == "POST":
            order_item_id = request.form.get("order_item_id", type=int)
            reason_code = request.form.get("reason_code", "").strip()
            matching = next((item for item in items if item["id"] == order_item_id), None)
            if not matching or not reason_code:
                error = "Select a valid item and reason."
            else:
                status = "replacement_only" if matching["product_line"] == "Festive Foods" else "requested"
                write(
                    """
                    INSERT INTO returns (order_id, order_item_id, reason_code, status, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (order_id, order_item_id, reason_code, status, datetime.utcnow().isoformat()),
                )
                log_event("return_requested", {"order_id": order_id, "order_item_id": order_item_id})
                success = (
                    "Return requested." if status == "requested" else "Replacement request created for food item."
                )
        return render_template(
            "returns_request.html",
            order=order,
            items=items,
            error=error,
            success=success,
        )

    @app.route("/account")
    @rate_limit_guard
    def account() -> str:
        profile = fetch_one("SELECT * FROM profiles WHERE user_id = 1")
        addresses = fetch_all("SELECT * FROM addresses WHERE user_id = 1")
        orders = fetch_all("SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC")
        return render_template("account.html", profile=profile, addresses=addresses, orders=orders)

    @app.route("/wishlist")
    @rate_limit_guard
    def wishlist() -> str:
        wishlists = fetch_all("SELECT * FROM wishlists WHERE user_id = 1")
        wishlist_items = fetch_all(
            """
            SELECT wishlist_items.*, products.name as product_name
            FROM wishlist_items
            JOIN products ON products.id = wishlist_items.product_id
            WHERE wishlist_items.user_id = 1
            """
        )
        return render_template("wishlist.html", wishlists=wishlists, wishlist_items=wishlist_items)

    @app.route("/corporate")
    @rate_limit_guard
    def corporate() -> str:
        bundles = fetch_all("SELECT * FROM bundles WHERE name LIKE '%Corporate%'")
        return render_template("corporate.html", bundles=bundles)

    @app.route("/content")
    @rate_limit_guard
    def content() -> str:
        pages = fetch_all("SELECT * FROM content_pages ORDER BY updated_at DESC")
        return render_template("content.html", pages=pages)

    @app.route("/support")
    @rate_limit_guard
    def support() -> str:
        faqs = fetch_all("SELECT * FROM content_pages WHERE category = 'FAQ'")
        return render_template("support.html", faqs=faqs)

    @app.route("/legal")
    @rate_limit_guard
    def legal() -> str:
        policies = fetch_all("SELECT * FROM content_pages WHERE category = 'Legal'")
        return render_template("legal.html", policies=policies)

    @app.route("/health")
    def health() -> Dict[str, str]:
        return {"status": "ok"}

    @app.route("/admin")
    @rate_limit_guard
    def admin_home() -> str:
        log_admin_action("view", "admin_home")
        orders = fetch_all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5")
        backlog_count = fetch_one("SELECT COUNT(*) as cnt FROM backlog_items")
        return render_template("admin/home.html", orders=orders, backlog_count=backlog_count["cnt"])

    @app.route("/admin/inventory")
    @rate_limit_guard
    def admin_inventory() -> str:
        log_admin_action("view", "inventory")
        batches = fetch_all(
            """
            SELECT inventory_batches.*, products.name as product_name, suppliers.name as supplier_name
            FROM inventory_batches
            JOIN products ON products.id = inventory_batches.product_id
            LEFT JOIN suppliers ON suppliers.id = inventory_batches.supplier_id
            ORDER BY expiry_date
            """
        )
        return render_template("admin/inventory.html", batches=batches)

    @app.route("/admin/catalog")
    @rate_limit_guard
    def admin_catalog() -> str:
        log_admin_action("view", "catalog")
        products = fetch_all("SELECT * FROM products ORDER BY product_line, name")
        return render_template("admin/catalog.html", products=products)

    @app.route("/admin/content")
    @rate_limit_guard
    def admin_content() -> str:
        log_admin_action("view", "content")
        pages = fetch_all("SELECT * FROM content_pages ORDER BY updated_at DESC")
        return render_template("admin/content.html", pages=pages)

    @app.route("/admin/promos")
    @rate_limit_guard
    def admin_promos() -> str:
        log_admin_action("view", "promos")
        promos = fetch_all("SELECT * FROM coupons ORDER BY id DESC")
        return render_template("admin/promos.html", promos=promos)

    @app.route("/admin/qc")
    @rate_limit_guard
    def admin_qc() -> str:
        log_admin_action("view", "qc_checks")
        checks = fetch_all(
            """
            SELECT qc_checks.*, inventory_batches.lot_no, products.name as product_name
            FROM qc_checks
            JOIN inventory_batches ON inventory_batches.id = qc_checks.batch_id
            JOIN products ON products.id = inventory_batches.product_id
            ORDER BY checked_at DESC
            """
        )
        return render_template("admin/qc.html", checks=checks)

    @app.route("/admin/orders")
    @rate_limit_guard
    def admin_orders() -> str:
        log_admin_action("view", "orders")
        orders = fetch_all("SELECT * FROM orders ORDER BY created_at DESC")
        return render_template("admin/orders.html", orders=orders)

    @app.route("/admin/reviews")
    @rate_limit_guard
    def admin_reviews() -> str:
        log_admin_action("view", "reviews")
        reviews = fetch_all(
            """
            SELECT reviews.*, products.name as product_name
            FROM reviews
            JOIN products ON products.id = reviews.product_id
            ORDER BY created_at DESC
            """
        )
        return render_template("admin/reviews.html", reviews=reviews)

    @app.route("/admin/returns")
    @rate_limit_guard
    def admin_returns() -> str:
        log_admin_action("view", "returns")
        returns = fetch_all(
            """
            SELECT returns.*, orders.status as order_status, products.name as product_name
            FROM returns
            JOIN order_items ON order_items.id = returns.order_item_id
            JOIN products ON products.id = order_items.product_id
            JOIN orders ON orders.id = returns.order_id
            """
        )
        return render_template("admin/returns.html", returns=returns)

    @app.route("/admin/backlog")
    @rate_limit_guard
    def admin_backlog() -> str:
        log_admin_action("view", "backlog")
        items = fetch_all("SELECT * FROM backlog_items ORDER BY item_id LIMIT 200")
        return render_template("admin/backlog.html", items=items)

    @app.route("/admin/plan")
    @rate_limit_guard
    def admin_plan() -> str:
        log_admin_action("view", "roadmap")
        plan_items = fetch_all("SELECT * FROM roadmap_items ORDER BY timeline")
        return render_template("admin/plan.html", plan_items=plan_items)

    @app.route("/admin/build-report")
    @rate_limit_guard
    def admin_build_report() -> str:
        log_admin_action("view", "build_report")
        needs_setup = [
            "Payment gateway integration",
            "Courier API integration",
            "WhatsApp notifications",
            "Production image CDN",
        ]
        next_steps = [
            "Integrate real payment gateway and webhook handlers.",
            "Add courier provider API for live tracking.",
            "Implement file upload scanning and virus checks.",
            "Add RLS and role-based auth once authentication provider is chosen.",
        ]
        return render_template(
            "admin/build_report.html",
            needs_setup=needs_setup,
            next_steps=next_steps,
        )

    @app.errorhandler(429)
    def too_many_requests(error: Exception) -> Tuple[str, int]:
        return render_template("errors/429.html"), 429

    return app


def init_db() -> None:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()
    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            email TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS profiles (
            user_id INTEGER PRIMARY KEY,
            name TEXT,
            phone TEXT,
            preferences_json TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            label TEXT,
            line1 TEXT,
            line2 TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            is_default INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            product_line TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            festival_tags TEXT,
            dietary TEXT,
            eco_flags TEXT,
            shelf_life_days INTEGER,
            storage TEXT,
            ingredients TEXT,
            allergens TEXT,
            image_url TEXT,
            is_active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS product_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            sku TEXT,
            variant_name TEXT,
            price_override REAL,
            stock_qty INTEGER,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            status TEXT
        );
        CREATE TABLE IF NOT EXISTS inventory_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            lot_no TEXT,
            mfg_date TEXT,
            expiry_date TEXT,
            qty INTEGER,
            supplier_id INTEGER,
            qc_status TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );
        CREATE TABLE IF NOT EXISTS qc_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            gate TEXT,
            status TEXT,
            notes TEXT,
            photo_url TEXT,
            checked_at TEXT,
            FOREIGN KEY (batch_id) REFERENCES inventory_batches(id)
        );
        CREATE TABLE IF NOT EXISTS bundles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            pricing_rule TEXT,
            items_json TEXT,
            is_active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS carts (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            status TEXT,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cart_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            variant_id INTEGER,
            qty INTEGER,
            price_each REAL,
            FOREIGN KEY (cart_id) REFERENCES carts(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            status TEXT,
            total_amount REAL,
            delivery_date TEXT,
            gift_message TEXT,
            gift_wrap INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            variant_id INTEGER,
            qty INTEGER,
            price_each REAL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            status TEXT,
            method TEXT,
            gateway_ref TEXT,
            needs_setup INTEGER DEFAULT 1,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
        CREATE TABLE IF NOT EXISTS shipments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            status TEXT,
            courier TEXT,
            tracking_no TEXT,
            needs_setup INTEGER DEFAULT 1,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
        CREATE TABLE IF NOT EXISTS returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            order_item_id INTEGER NOT NULL,
            reason_code TEXT,
            status TEXT,
            photo_url TEXT,
            created_at TEXT,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        );
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT,
            description TEXT,
            discount_type TEXT,
            value REAL,
            active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            rating INTEGER,
            title TEXT,
            body TEXT,
            status TEXT,
            created_at TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        CREATE TABLE IF NOT EXISTS review_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review_id INTEGER NOT NULL,
            photo_url TEXT,
            FOREIGN KEY (review_id) REFERENCES reviews(id)
        );
        CREATE TABLE IF NOT EXISTS content_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT,
            title TEXT,
            category TEXT,
            body TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            channel TEXT,
            status TEXT,
            payload_json TEXT,
            needs_setup INTEGER DEFAULT 1,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_user TEXT,
            action TEXT,
            target TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT,
            payload_json TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS festival_calendar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month_index INTEGER,
            name TEXT,
            region TEXT,
            description TEXT
        );
        CREATE TABLE IF NOT EXISTS wishlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT,
            festival TEXT,
            recipient TEXT
        );
        CREATE TABLE IF NOT EXISTS wishlist_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            wishlist_id INTEGER,
            product_id INTEGER
        );
        CREATE TABLE IF NOT EXISTS serviceability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pincode TEXT,
            region TEXT,
            is_serviceable INTEGER DEFAULT 1,
            cod_allowed INTEGER DEFAULT 0,
            cutoff_hour INTEGER DEFAULT 17
        );
        CREATE TABLE IF NOT EXISTS backlog_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT,
            category TEXT,
            priority TEXT,
            status TEXT,
            owner TEXT,
            notes TEXT
        );
        CREATE TABLE IF NOT EXISTS roadmap_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phase TEXT,
            title TEXT,
            timeline TEXT,
            status TEXT,
            notes TEXT
        );
        """
    )
    conn.commit()
    conn.close()


def seed_data() -> None:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    existing = cursor.execute("SELECT COUNT(*) as cnt FROM products").fetchone()
    if existing["cnt"] > 0:
        conn.close()
        return

    cursor.execute(
        "INSERT INTO users (id, email, created_at) VALUES (1, 'demo@seasonville.in', ?)",
        (datetime.utcnow().isoformat(),),
    )
    cursor.execute(
        "INSERT INTO profiles (user_id, name, phone, preferences_json) VALUES (1, ?, ?, ?)",
        ("Aarohi Mehta", "+91-90000-12345", json.dumps({"festival": "Diwali"})),
    )
    cursor.execute(
        """
        INSERT INTO addresses (user_id, label, line1, line2, city, state, pincode, is_default)
        VALUES (1, 'Home', '14/2 Residency Road', 'Near MG Road', 'Bengaluru', 'Karnataka', '560001', 1)
        """
    )

    for month_index, name, region, description in FESTIVAL_CALENDAR:
        cursor.execute(
            "INSERT INTO festival_calendar (month_index, name, region, description) VALUES (?, ?, ?, ?)",
            (month_index, name, region, description),
        )

    products = [
        (
            "Diwali Signature Hamper",
            "Signature Hampers",
            "Premium hamper with sweets, diyas, and a festival sleeve.",
            2499,
            "Diwali,Navratri",
            "Vegetarian",
            "Recyclable",
            120,
            "Cool dry place",
            "Assorted nuts, sweets, decor",
            "Contains nuts",
            "https://images.unsplash.com/photo-1607082349566-1870d1e145f8",
        ),
        (
            "Holi Skin & Hair Mini Kit",
            "Care Line",
            "Dermatologist-tested minis for pre/post Holi care.",
            799,
            "Holi",
            "Vegan",
            "Plastic-free",
            365,
            "Room temperature",
            "Aloe, neem, oat",
            "None",
            "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c",
        ),
        (
            "Puja Essentials Thali Combo",
            "Puja Essentials",
            "Complete thali with roli, chawal, diya, and incense.",
            599,
            "Navratri,Durga Puja",
            "Vegetarian",
            "Recyclable",
            365,
            "Room temperature",
            "Roli, chawal, brass diya",
            "None",
            "https://images.unsplash.com/photo-1519681393784-d120267933ba",
        ),
        (
            "Festive Dry Fruit Mix",
            "Festive Foods",
            "Roasted almonds, cashews, pistachios in sealed jar.",
            899,
            "Diwali,Rakhi",
            "Vegetarian",
            "Recyclable",
            180,
            "Cool dry place",
            "Almonds, cashews, pistachios",
            "Contains nuts",
            "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0",
        ),
        (
            "Home Glow Candle Set",
            "Home Glow & Decor",
            "Saffron-amber scented candles with maroon holders.",
            1099,
            "Diwali,Christmas",
            "Vegetarian",
            "Reusable",
            365,
            "Room temperature",
            "Soy wax, essential oils",
            "None",
            "https://images.unsplash.com/photo-1501004318641-b39e6451bec6",
        ),
        (
            "Kids Festive Craft Box",
            "Kids Festive",
            "DIY rangoli, stickers, and activity sheets.",
            699,
            "Diwali,Holi",
            "Vegetarian",
            "Recyclable",
            365,
            "Room temperature",
            "Paper, colors, glue",
            "None",
            "https://images.unsplash.com/photo-1455885666463-1b519bdb6ea0",
        ),
        (
            "Corporate Gifting Starter",
            "Corporate Gifting",
            "Custom sleeve hamper with GST-ready invoice.",
            1999,
            "Year-end Corporate,Diwali",
            "Vegetarian",
            "Recyclable",
            180,
            "Cool dry place",
            "Snacks, decor, note card",
            "Contains nuts",
            "https://images.unsplash.com/photo-1509395176047-4a66953fd231",
        ),
    ]
    cursor.executemany(
        """
        INSERT INTO products
        (name, product_line, description, price, festival_tags, dietary, eco_flags, shelf_life_days, storage, ingredients, allergens, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        products,
    )

    variants = [
        (1, "SV-HAMP-MINI", "Mini", 1999, 20),
        (1, "SV-HAMP-STD", "Standard", 2499, 15),
        (1, "SV-HAMP-PREM", "Premium", 3499, 10),
        (4, "SV-FOOD-500", "500g Jar", 899, 50),
        (4, "SV-FOOD-1KG", "1kg Jar", 1599, 25),
    ]
    cursor.executemany(
        """
        INSERT INTO product_variants (product_id, sku, variant_name, price_override, stock_qty)
        VALUES (?, ?, ?, ?, ?)
        """,
        variants,
    )

    suppliers = [
        ("Sunrise Foods", "care@sunrisefoods.in", "active"),
        ("CraftGlow Studios", "ops@craftglow.in", "active"),
    ]
    cursor.executemany("INSERT INTO suppliers (name, contact, status) VALUES (?, ?, ?)", suppliers)

    batches = [
        (4, "SV-2406-SUP-001", "2024-06-02", "2024-12-02", 120, 1, "passed"),
        (4, "SV-2408-SUP-002", "2024-08-01", "2025-02-01", 80, 1, "pending"),
        (2, "SV-2405-SUP-101", "2024-05-01", "2025-05-01", 60, 2, "passed"),
    ]
    cursor.executemany(
        """
        INSERT INTO inventory_batches (product_id, lot_no, mfg_date, expiry_date, qty, supplier_id, qc_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        batches,
    )

    qc_checks = [
        (1, "Gate A", "approved", "Artwork sign-off completed.", "", datetime.utcnow().isoformat()),
        (1, "Gate C", "approved", "Incoming QC passed.", "", datetime.utcnow().isoformat()),
        (2, "Gate B", "in_progress", "Random production checks underway.", "", datetime.utcnow().isoformat()),
    ]
    cursor.executemany(
        """
        INSERT INTO qc_checks (batch_id, gate, status, notes, photo_url, checked_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        qc_checks,
    )

    bundles = [
        (
            "Diwali Family Glow",
            "Diyas, sweets, and puja essentials for family gatherings.",
            "Dynamic price: 10% off 3 items",
            json.dumps({"festival": "Diwali", "items": [1, 3, 5]}),
        ),
        (
            "Holi Safe Play",
            "Color-safe kits with care essentials.",
            "Dynamic price: 5% off 3 items",
            json.dumps({"festival": "Holi", "items": [2, 6, 4]}),
        ),
        (
            "Corporate Spark",
            "Bulk-friendly hamper with custom sleeves.",
            "Dynamic price: 12% off 5 items",
            json.dumps({"festival": "Year-end Corporate", "items": [7, 4, 5]}),
        ),
    ]
    cursor.executemany(
        """
        INSERT INTO bundles (name, description, pricing_rule, items_json)
        VALUES (?, ?, ?, ?)
        """,
        bundles,
    )

    coupons = [
        ("FESTIVE10", "10% off on hampers above ₹1999", "percent", 10, 1),
        ("WELCOME200", "₹200 off on first order", "flat", 200, 1),
    ]
    cursor.executemany(
        "INSERT INTO coupons (code, description, discount_type, value, active) VALUES (?, ?, ?, ?, ?)",
        coupons,
    )

    content_pages = [
        (
            "festival-gifting-guide",
            "Festival Gifting Guide",
            "Guide",
            "A curated guide to choose the right hamper for every celebration.",
        ),
        (
            "care-guide-holi",
            "Holi Skin & Hair Care Guide",
            "Guide",
            "Prep and recovery tips with SeasonVille care line essentials.",
        ),
        (
            "faq-returns",
            "Returns & Replacement",
            "FAQ",
            "Food items are replacement-only within 48 hours. Non-food items have 7-day returns.",
        ),
        (
            "privacy-policy",
            "Privacy Policy",
            "Legal",
            "We collect only essential order data and never sell personal information.",
        ),
        (
            "shipping-policy",
            "Shipping Policy",
            "Legal",
            "Deliveries across India with festive cutoffs communicated per pincode.",
        ),
    ]
    cursor.executemany(
        """
        INSERT INTO content_pages (slug, title, category, body, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        [(slug, title, category, body, datetime.utcnow().isoformat()) for slug, title, category, body in content_pages],
    )

    cursor.executemany(
        """
        INSERT INTO serviceability (pincode, region, is_serviceable, cod_allowed, cutoff_hour)
        VALUES (?, ?, ?, ?, ?)
        """,
        [
            ("110001", "Delhi", 1, 1, 17),
            ("560001", "Bengaluru", 1, 1, 16),
            ("400001", "Mumbai", 1, 0, 15),
        ],
    )

    wishlists = [
        (1, "Diwali Family", "Diwali", "Parents"),
        (1, "Rakhi Gifts", "Rakhi", "Sibling"),
    ]
    cursor.executemany(
        "INSERT INTO wishlists (user_id, name, festival, recipient) VALUES (?, ?, ?, ?)",
        wishlists,
    )
    cursor.executemany(
        "INSERT INTO wishlist_items (user_id, wishlist_id, product_id) VALUES (?, ?, ?)",
        [(1, 1, 1), (1, 1, 5), (1, 2, 4)],
    )

    cursor.executemany(
        """
        INSERT INTO reviews (product_id, user_id, rating, title, body, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (1, 1, 5, "Premium feel", "Packaging was luxe and on-time.", "approved", datetime.utcnow().isoformat()),
            (4, 1, 4, "Fresh mix", "Loved the roast and crunch.", "approved", datetime.utcnow().isoformat()),
            (5, 1, 5, "Elegant glow", "Candles felt premium and festive.", "pending", datetime.utcnow().isoformat()),
        ],
    )

    roadmap_items = [
        ("Weeks 1-4", "Brand system + top 50 SKUs", "2024-01", "done", "Core brand and IA finalized."),
        ("Weeks 5-8", "QC checklists + core site build", "2024-02", "in_progress", "QC gates and ops playbooks."),
        ("Weeks 9-12", "Pilot batch + soft launch", "2024-03", "planned", "Soft launch with 5 cities."),
        ("Weeks 13-16", "Fix ops + add bundles", "2024-04", "planned", "Add loyalty basics."),
        ("Weeks 17-20", "Scale inventory + corporate flow", "2024-05", "planned", "Corporate GST flows."),
        ("Weeks 21-24", "Peak readiness dashboards", "2024-06", "planned", "Cutoffs + CRO tests."),
    ]
    cursor.executemany(
        "INSERT INTO roadmap_items (phase, title, timeline, status, notes) VALUES (?, ?, ?, ?, ?)",
        roadmap_items,
    )

    backlog_items = []
    priorities = ["P0", "P1", "P2"]
    statuses = ["todo", "in_progress", "blocked"]
    owner = "Product + Eng"
    for idx in range(1, 521):
        item_id = f"SV-WEB-{idx:03d}"
        category = BACKLOG_CATEGORIES[(idx - 1) % len(BACKLOG_CATEGORIES)]
        priority = priorities[(idx - 1) % len(priorities)]
        status = statuses[(idx - 1) % len(statuses)]
        note = f"Backlog item {item_id} for {category}."
        backlog_items.append((item_id, category, priority, status, owner, note))
    cursor.executemany(
        """
        INSERT INTO backlog_items (item_id, category, priority, status, owner, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        backlog_items,
    )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8000, debug=False)
