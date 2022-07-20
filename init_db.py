from tools import db


def init_db():
    from .models.ui_tests import UIPerformanceTests
    db.Base.metadata.create_all(bind=db.engine)

