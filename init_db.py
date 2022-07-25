from tools import db


def init_db():
    from .models.ui_tests import UIPerformanceTests
    from .models.ui_report import UIReport
    from .models.ui_result import UIResult
    db.Base.metadata.create_all(bind=db.engine)

