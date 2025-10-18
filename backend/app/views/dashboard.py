from flask import Blueprint, render_template

views_bp = Blueprint('views', __name__)

@views_bp.route('/')
def dashboard():
    # Render dashboard template, frontend can call /api/receivables/<customer_id> via JS to fetch data
    return render_template('dashboard.html')
