from flask import (
    Blueprint, flash, g, redirect, render_template, request, url_for
)
from werkzeug.exceptions import abort

from flaskmaps.auth import login_required
from flaskmaps.db import get_db

bp = Blueprint('maps', __name__)

@bp.route('/')
def index():
    
    if (g.user):
        db = get_db()
        locations = db.execute(
            '''
            SELECT l.id, l.name, l.location_x, l.location_y, l.author_id, u.username
            FROM location l
            JOIN user u ON l.author_id = u.id
            ORDER BY l.id DESC
            '''
        ).fetchall()
    else:
        locations = []

    return render_template('index/index.html', locations=locations)