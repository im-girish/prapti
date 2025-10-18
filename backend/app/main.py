# backend/app/main.py
from fasthtml.common import *
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException
import os, time
from sqlalchemy import create_engine, Column, Integer, String, Date, Float
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError
from datetime import date

# 1) Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://prapti_user:prapti_pass@db:5432/prapti_db")

# 2) Robust DB connect with retries (useful in Docker)
max_attempts = 10
engine = None
for attempt in range(max_attempts):
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect():
            break
    except OperationalError:
        print(f"DB connection attempt {attempt+1} failed, retrying in 3s...")
        time.sleep(3)
else:
    raise Exception("Could not connect to database after several attempts.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 3) Model
class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String, nullable=False)
    invoice_number = Column(String, nullable=False, unique=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    amount_due = Column(Float, nullable=False)
    amount_paid = Column(Float, nullable=False, default=0.0)

    def is_paid(self):
        return self.amount_paid >= self.amount_due

    def outstanding_amount(self):
        return max(0.0, self.amount_due - self.amount_paid)

    def aging_days(self):
        if self.is_paid():
            return 0
        today = date.today()
        return (today - self.due_date).days if today > self.due_date else 0

# 4) FastHTML app and static/template mounts
app, rt = fast_app()
STATIC_DIR = "/app/frontend/static"      # inside container
TEMPLATE_DIR = "/app/frontend/templates" # inside container
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 5) HTML dashboard
@rt("/")
def dashboard():
    dashboard_path = os.path.join(TEMPLATE_DIR, "dashboard.html")
    with open(dashboard_path, "r", encoding="utf-8") as f:
        return f.read()

# 6) API: Receivables aging
@rt("/api/receivables/{customer_id}")
def receivables_report(customer_id: str):
    session = SessionLocal()
    invoices = session.query(Invoice).filter(Invoice.customer_id == customer_id).all()

    buckets = {
        "current": 0.0,
        "1_30": 0.0,
        "31_60": 0.0,
        "61_90": 0.0,
        "over_90": 0.0
    }
    detailed = []

    for inv in invoices:
        if inv.is_paid():
            continue
        aging = inv.aging_days()
        amt = inv.outstanding_amount()

        if aging == 0:
            buckets["current"] += amt
        elif 1 <= aging <= 30:
            buckets["1_30"] += amt
        elif 31 <= aging <= 60:
            buckets["31_60"] += amt
        elif 61 <= aging <= 90:
            buckets["61_90"] += amt
        else:
            buckets["over_90"] += amt

        detailed.append({
            "invoice_number": inv.invoice_number,
            "invoice_date": str(inv.invoice_date),
            "due_date": str(inv.due_date),
            "amount_due": inv.amount_due,
            "amount_paid": inv.amount_paid,
            "outstanding_amount": amt,
            "aging_days": aging
        })

    session.close()

    # Return empty summary with empty details instead of raising 404,
    # so front-end can always parse JSON successfully.
    if not invoices:
        return {"customer_id": customer_id, "summary": buckets, "detailed": []}

    return {"customer_id": customer_id, "summary": buckets, "detailed": detailed}

# Optional: print routes during boot to verify registration
for route in app.routes:
    print(f"ROUTE: {getattr(route, 'path', str(route))}")

# 7) Create tables and start server
if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    # Serve on 0.0.0.0:5001 to match your browser (localhost:5001)
    serve(host="0.0.0.0", port=5001)

@rt("/api/dev/seed/{customer_id}", methods=["POST"])
def seed_sample_data(customer_id: str):
    """Insert sample invoices for quick testing."""
    session = SessionLocal()
    # prevent duplicates on re-seed
    session.query(Invoice).filter(Invoice.customer_id == customer_id).delete()
    today = date.today()
    samples = [
        # current (due today or future -> aging 0)
        Invoice(customer_id=customer_id, invoice_number="INV-001",
                invoice_date=today, due_date=today, amount_due=500.0, amount_paid=100.0),
        # 1-30 days overdue
        Invoice(customer_id=customer_id, invoice_number="INV-002",
                invoice_date=today, due_date=today.replace(day=max(1, today.day-10)),
                amount_due=1200.0, amount_paid=200.0),
        # 31-60
        Invoice(customer_id=customer_id, invoice_number="INV-003",
                invoice_date=today, due_date=today.replace(day=max(1, today.day-40)),
                amount_due=900.0, amount_paid=0.0),
        # 61-90
        Invoice(customer_id=customer_id, invoice_number="INV-004",
                invoice_date=today, due_date=today.replace(day=max(1, today.day-70)),
                amount_due=2000.0, amount_paid=250.0),
        # > 90
        Invoice(customer_id=customer_id, invoice_number="INV-005",
                invoice_date=today, due_date=today.replace(day=max(1, today.day-110)),
                amount_due=1500.0, amount_paid=0.0),
    ]
    session.add_all(samples)
    session.commit()
    session.close()
    return {"status": "ok", "seeded": len(samples), "customer_id": customer_id}

@rt("/api/dev/reset/{customer_id}", methods=["POST"])
def reset_customer_data(customer_id: str):
    session = SessionLocal()
    deleted = session.query(Invoice).filter(Invoice.customer_id == customer_id).delete()
    session.commit()
    session.close()
    return {"status": "ok", "deleted": deleted, "customer_id": customer_id}
