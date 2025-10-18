import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import date, timedelta
from main import Invoice, Base, SessionLocal, engine

def seed():
    # Create tables if not already created
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()

    today = date.today()

    invoices = [
        Invoice(
            customer_id='test_customer',
            invoice_number='INV1001',
            invoice_date=today - timedelta(days=20),
            due_date=today - timedelta(days=5),
            amount_due=1000,
            amount_paid=400
        ),
        Invoice(
            customer_id='test_customer',
            invoice_number='INV1002',
            invoice_date=today - timedelta(days=60),
            due_date=today - timedelta(days=50),
            amount_due=800,
            amount_paid=300
        ),
        Invoice(
            customer_id='test_customer',
            invoice_number='INV1003',
            invoice_date=today - timedelta(days=90),
            due_date=today - timedelta(days=80),
            amount_due=1500,
            amount_paid=0
        ),
        Invoice(
            customer_id='test_customer',
            invoice_number='INV1004',
            invoice_date=today - timedelta(days=10),
            due_date=today + timedelta(days=10),
            amount_due=500,
            amount_paid=0
        ),
    ]

    session.add_all(invoices)
    session.commit()
    session.close()
    print("Test invoices inserted.")

if __name__ == "__main__":
    seed()
