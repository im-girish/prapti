from backend.app.db import db
from datetime import date

class Invoice(db.Model):
    __tablename__ = 'invoices'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.String, nullable=False)
    invoice_number = db.Column(db.String, nullable=False, unique=True)
    invoice_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    amount_due = db.Column(db.Float, nullable=False)
    amount_paid = db.Column(db.Float, nullable=False, default=0.0)

    @property
    def is_paid(self):
        return self.amount_paid >= self.amount_due

    @property
    def outstanding_amount(self):
        return max(0.0, self.amount_due - self.amount_paid)

    def aging_days(self):
        if self.is_paid:
            return 0
        today = date.today()
        return (today - self.due_date).days if today > self.due_date else 0
