from flask import Blueprint, jsonify, request
from backend.app.models import Invoice
from backend.app.db import db
from datetime import date

api_bp = Blueprint('api', __name__)

@api_bp.route('/receivables/<string:customer_id>', methods=['GET'])
def receivables_report(customer_id):
    invoices = Invoice.query.filter_by(customer_id=customer_id).all()
    today = date.today()

    # Aging buckets
    buckets = {
        "current": 0.0,
        "1_30": 0.0,
        "31_60": 0.0,
        "61_90": 0.0,
        "over_90": 0.0
    }

    detailed_invoices = []

    for inv in invoices:
        if inv.is_paid:
            continue
        aging = inv.aging_days()
        amt = inv.outstanding_amount

        # Assign to aging bucket
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

        detailed_invoices.append({
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date.isoformat(),
            "due_date": inv.due_date.isoformat(),
            "amount_due": inv.amount_due,
            "amount_paid": inv.amount_paid,
            "outstanding_amount": amt,
            "aging_days": aging
        })

    response = {
        "customer_id": customer_id,
        "summary": buckets,
        "detailed": detailed_invoices
    }

    return jsonify(response)
